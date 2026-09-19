import { IIncident } from '../models/Incident.js';

export interface CorrelationCandidate {
  rawText: string;
  type?: string;
  category?: string;
  location: {
    address?: string;
    coordinates?: [number, number]; // [lng, lat]
  };
  timestamp?: Date;
}

export type CorrelationMatchType = 'AUTOMATIC_LINK' | 'OPERATOR_REVIEW' | 'DISTINCT';

export interface CorrelationMatchResult {
  isDuplicate: boolean;
  confidenceScore: number; // 0 - 100
  matchType: CorrelationMatchType;
  matchedIncident?: {
    id: string;
    incidentNumber: string;
    title: string;
    type: string;
    severity: string;
    status: string;
    location: {
      address: string;
      coordinates: [number, number];
    };
    distanceMeters: number;
    timeDeltaMinutes: number;
  };
  scoreBreakdown: {
    distanceScore: number;
    temporalScore: number;
    typeCompatibilityScore: number;
    jaccardTextSimilarityScore: number;
  };
  explanation: string[];
}

/**
 * Calculate Haversine distance in meters between two [lng, lat] coordinates.
 */
export const calculateHaversineDistanceMeters = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'it', 'there', 'this', 'that', 'near', 'reported', 'calling',
  'we', 'i', 'have', 'has', 'had', 'been', 'some', 'about', 'just', 'saw', 'seeing'
]);

/**
 * Tokenize and normalize text into clean keyword tokens.
 */
export const tokenizeText = (text: string): Set<string> => {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
};

/**
 * Deterministic Jaccard text similarity coefficient (0.0 to 1.0).
 * Phase 2 uses deterministic Jaccard similarity; semantic embeddings / Gemini-based
 * matching are reserved for Phase 3.
 */
export const calculateJaccardSimilarity = (textA: string, textB: string): number => {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
};

/**
 * Evaluates an incoming report candidate against a list of active master incidents.
 *
 * Correlation Rules:
 * 1. Incoming Report to Existing Master Incident:
 *    - >= 80%: AUTOMATIC_LINK (Report is automatically linked to the master incident)
 *    - 50% - 79%: OPERATOR_REVIEW (Requires dispatcher review in triage queue)
 *    - < 50%: DISTINCT (Separate incident/report)
 * 2. Merging two already-existing incidents:
 *    - NEVER automatic; always requires explicit human operator confirmation.
 */
export const correlateWithIncidents = (
  candidate: CorrelationCandidate,
  activeIncidents: IIncident[]
): CorrelationMatchResult => {
  if (!activeIncidents || activeIncidents.length === 0) {
    return {
      isDuplicate: false,
      confidenceScore: 0,
      matchType: 'DISTINCT',
      scoreBreakdown: {
        distanceScore: 0,
        temporalScore: 0,
        typeCompatibilityScore: 0,
        jaccardTextSimilarityScore: 0,
      },
      explanation: ['No active incidents available in area to correlate against.'],
    };
  }

  let bestResult: CorrelationMatchResult = {
    isDuplicate: false,
    confidenceScore: 0,
    matchType: 'DISTINCT',
    scoreBreakdown: {
      distanceScore: 0,
      temporalScore: 0,
      typeCompatibilityScore: 0,
      jaccardTextSimilarityScore: 0,
    },
    explanation: ['No correlation candidate exceeded similarity thresholds.'],
  };

  const candidateTime = candidate.timestamp ? new Date(candidate.timestamp).getTime() : Date.now();

  for (const incident of activeIncidents) {
    // Only correlate with active operational states
    if (['RESOLVED', 'MERGED'].includes(incident.status)) {
      continue;
    }

    const explanation: string[] = [];

    // 1. Spatial Proximity (Max 35 pts, <= 750m threshold)
    let distanceScore = 0;
    let distanceMeters = 99999;
    if (candidate.location.coordinates && incident.location?.coordinates) {
      distanceMeters = calculateHaversineDistanceMeters(
        candidate.location.coordinates,
        incident.location.coordinates
      );

      if (distanceMeters <= 200) {
        distanceScore = 35;
        explanation.push(`Immediate geographic vicinity (${distanceMeters}m <= 200m): +35 pts`);
      } else if (distanceMeters <= 500) {
        distanceScore = 25;
        explanation.push(`Close geographic radius (${distanceMeters}m <= 500m): +25 pts`);
      } else if (distanceMeters <= 750) {
        distanceScore = 15;
        explanation.push(`Perimeter radius (${distanceMeters}m <= 750m): +15 pts`);
      } else {
        explanation.push(`Beyond spatial correlation threshold (${distanceMeters}m > 750m): +0 pts`);
      }
    }

    // 2. Temporal Window (Max 25 pts, <= 60 min threshold)
    let temporalScore = 0;
    const incidentTime = new Date(incident.createdAt).getTime();
    const timeDeltaMinutes = Math.max(0, Math.round((candidateTime - incidentTime) / (1000 * 60)));

    if (timeDeltaMinutes <= 15) {
      temporalScore = 25;
      explanation.push(`Within immediate time window (${timeDeltaMinutes}m <= 15m): +25 pts`);
    } else if (timeDeltaMinutes <= 30) {
      temporalScore = 20;
      explanation.push(`Within short time window (${timeDeltaMinutes}m <= 30m): +20 pts`);
    } else if (timeDeltaMinutes <= 60) {
      temporalScore = 10;
      explanation.push(`Within 1-hour window (${timeDeltaMinutes}m <= 60m): +10 pts`);
    } else {
      explanation.push(`Report exceeds 60-minute window (${timeDeltaMinutes}m): +0 pts`);
    }

    // 3. Category / Type Compatibility (Max 20 pts)
    let typeScore = 0;
    const candidateType = (candidate.type || candidate.category || '').toUpperCase();
    const incidentType = (incident.type || '').toUpperCase();

    if (candidateType && incidentType) {
      if (candidateType === incidentType) {
        typeScore = 20;
        explanation.push(`Exact incident type match (${incidentType}): +20 pts`);
      } else if (
        (candidateType.includes('FIRE') && incidentType.includes('FIRE')) ||
        (candidateType.includes('TRAFFIC') && incidentType.includes('ROAD_ACCIDENT')) ||
        (candidateType.includes('CRASH') && incidentType.includes('ROAD_ACCIDENT')) ||
        (candidateType.includes('GAS') && incidentType.includes('INDUSTRIAL_ACCIDENT')) ||
        (candidateType.includes('HAZARD') && incidentType.includes('INDUSTRIAL_ACCIDENT')) ||
        (candidateType.includes('SMOKE') && incidentType.includes('FIRE'))
      ) {
        typeScore = 15;
        explanation.push(`Cross-compatible incident category (${candidateType} ~ ${incidentType}): +15 pts`);
      } else {
        explanation.push(`Incident category mismatch (${candidateType} vs ${incidentType}): +0 pts`);
      }
    }

    // 4. Deterministic Jaccard Text Similarity (Max 20 pts)
    // Note: Phase 2 uses deterministic Jaccard token overlap; Phase 3 introduces semantic Gemini embeddings
    const combinedIncidentText = `${incident.title} ${incident.description} ${incident.location.address || ''}`;
    const combinedCandidateText = `${candidate.rawText} ${candidate.location.address || ''}`;
    const jaccardSim = calculateJaccardSimilarity(combinedCandidateText, combinedIncidentText);
    const jaccardTextScore = Math.round(jaccardSim * 20);

    if (jaccardTextScore > 0) {
      explanation.push(`Deterministic Jaccard keyword overlap (${(jaccardSim * 100).toFixed(0)}%): +${jaccardTextScore} pts`);
    } else {
      explanation.push('Deterministic Jaccard text overlap: 0 pts');
    }

    // Total Composite Confidence Score (0 - 100)
    const confidenceScore = Math.min(100, distanceScore + temporalScore + typeScore + jaccardTextScore);

    // Determine Match Type for incoming report
    let matchType: CorrelationMatchType = 'DISTINCT';
    if (confidenceScore >= 80) {
      matchType = 'AUTOMATIC_LINK';
    } else if (confidenceScore >= 50) {
      matchType = 'OPERATOR_REVIEW';
    }

    if (confidenceScore > bestResult.confidenceScore) {
      bestResult = {
        isDuplicate: confidenceScore >= 50,
        confidenceScore,
        matchType,
        matchedIncident: {
          id: String(incident._id),
          incidentNumber: incident.incidentNumber,
          title: incident.title,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          location: {
            address: incident.location.address,
            coordinates: incident.location.coordinates,
          },
          distanceMeters,
          timeDeltaMinutes,
        },
        scoreBreakdown: {
          distanceScore,
          temporalScore,
          typeCompatibilityScore: typeScore,
          jaccardTextSimilarityScore: jaccardTextScore,
        },
        explanation,
      };
    }
  }

  return bestResult;
};
