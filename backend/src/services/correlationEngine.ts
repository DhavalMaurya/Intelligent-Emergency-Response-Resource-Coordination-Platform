import { IIncident } from '../models/Incident.js';
import { calculateCosineSimilarity, cosineToSemanticPoints } from './vectorEmbeddingService.js';

export interface CorrelationCandidate {
  rawText: string;
  type?: string;
  category?: string;
  location: {
    address?: string;
    coordinates?: [number, number]; // [lng, lat]
  };
  timestamp?: Date;
  candidateEmbedding?: number[];
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
    embeddingSimilarityScore: number;
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
 * Enforces Phase 3 Correlation Rules:
 * 1. Mandatory Incident-Type Gate (Max 15 pts): If type compatibility fails, correlation is REJECTED (DISTINCT).
 * 2. Spatial Proximity (Max 35 pts)
 * 3. Temporal Window (Max 25 pts)
 * 4. Deterministic Jaccard Similarity (Max 12.5 pts)
 * 5. Gemini Semantic Vector Embedding Cosine Similarity (Max 12.5 pts) -> Math.round(cosine * 12.5)
 * 6. Overall Composite Score >= 80% strictly required for AUTOMATIC_LINK. High cosine similarity alone never bypasses this threshold.
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
        embeddingSimilarityScore: 0,
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
      embeddingSimilarityScore: 0,
    },
    explanation: ['No correlation candidate exceeded similarity thresholds.'],
  };

  const candidateTime = candidate.timestamp ? new Date(candidate.timestamp).getTime() : Date.now();

  for (const incident of activeIncidents) {
    if (['RESOLVED', 'MERGED'].includes(incident.status)) {
      continue;
    }

    const explanation: string[] = [];

    // 1. Mandatory Category / Type Compatibility Gate (Max 15 pts)
    let typeScore = 0;
    const candidateType = (candidate.type || candidate.category || '').toUpperCase();
    const incidentType = (incident.type || '').toUpperCase();

    if (candidateType && incidentType) {
      if (candidateType === incidentType) {
        typeScore = 15;
        explanation.push(`Exact incident type match (${incidentType}): +15 pts`);
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
        explanation.push(`MANDATORY TYPE GATE FAILED (${candidateType} vs ${incidentType}): Correlation rejected.`);
        // Mandatory incident-type gate failed -> Reject correlation for this incident immediately
        continue;
      }
    } else {
      // Neutral baseline when type is unassigned
      typeScore = 10;
      explanation.push(`Unassigned category baseline: +10 pts`);
    }

    // 2. Spatial Proximity (Max 35 pts, <= 750m threshold)
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

    // 3. Temporal Window (Max 25 pts, <= 60 min threshold)
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

    // 4. Deterministic Jaccard Text Similarity (Max 12.5 pts or 25 pts fallback)
    const combinedIncidentText = `${incident.title} ${incident.description} ${incident.location.address || ''}`;
    const combinedCandidateText = `${candidate.rawText} ${candidate.location.address || ''}`;
    const jaccardSim = calculateJaccardSimilarity(combinedCandidateText, combinedIncidentText);

    // 5. Semantic Vector Embedding Similarity (Max 12.5 pts)
    let embeddingScore = 0;
    let jaccardTextScore = 0;

    if (candidate.candidateEmbedding && incident.embedding && incident.embedding.length > 0) {
      const cosineSim = calculateCosineSimilarity(candidate.candidateEmbedding, incident.embedding);
      embeddingScore = cosineToSemanticPoints(cosineSim);
      jaccardTextScore = Math.round(jaccardSim * 12.5);
      explanation.push(`Deterministic Jaccard keyword overlap (${(jaccardSim * 100).toFixed(0)}%): +${jaccardTextScore} pts`);
      explanation.push(`Gemini semantic vector cosine similarity (${(cosineSim * 100).toFixed(1)}%): +${embeddingScore} pts`);
    } else {
      // Deterministic fallback mode: Jaccard text score takes full 25 pts allocation
      jaccardTextScore = Math.round(jaccardSim * 25);
      explanation.push(`Deterministic Jaccard text overlap (${(jaccardSim * 100).toFixed(0)}%): +${jaccardTextScore} pts`);
      explanation.push(`Gemini vector embedding score: 0 pts (Deterministic fallback mode active)`);
    }

    // Total Composite Confidence Score (0 - 100)
    const confidenceScore = Math.min(100, distanceScore + temporalScore + typeScore + jaccardTextScore + embeddingScore);

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
          embeddingSimilarityScore: embeddingScore,
        },
        explanation,
      };
    }
  }

  return bestResult;
};
