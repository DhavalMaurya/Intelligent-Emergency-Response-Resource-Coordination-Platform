import { IncidentType, IncidentSeverity, IncidentPriority } from '../models/Incident.js';

export interface SeverityInput {
  type: IncidentType;
  casualtiesCount: number;
  hazards?: {
    explosionConfirmed?: boolean;
    toxicChemicalOrHazardous?: boolean;
    trappedPersons?: boolean;
    fireSpreading?: boolean;
  };
  infrastructureRisk?: boolean; // transit hub, expressway, hospital zone, high-density residential
}

export interface SeverityResult {
  score: number; // 0 - 100 strictly capped
  severity: IncidentSeverity;
  priority: IncidentPriority;
  breakdown: {
    baseScore: number;
    casualtiesScore: number;
    hazardsScore: number;
    infrastructureScore: number;
  };
  explanation: string[];
}

/**
 * Deterministic Emergency Severity & Priority Engine
 * Capped strictly at 100 points with mutually exclusive casualty tiers
 * and non-stacking single-credit hazard modifiers.
 */
export const calculateSeverity = (input: SeverityInput): SeverityResult => {
  const explanation: string[] = [];
  let baseScore = 0;

  // 1. Incident Type Base Points (Max 25 pts, mutually exclusive)
  switch (input.type) {
    case 'INDUSTRIAL_ACCIDENT':
    case 'BUILDING_COLLAPSE':
      baseScore = 25;
      explanation.push(`${input.type} base severity: +25 pts`);
      break;
    case 'FIRE':
      baseScore = 20;
      explanation.push('Fire incident base severity: +20 pts');
      break;
    case 'ROAD_ACCIDENT':
    case 'MEDICAL':
      baseScore = 15;
      explanation.push(`${input.type} base severity: +15 pts`);
      break;
    case 'FLOOD':
    case 'EARTHQUAKE':
    case 'OTHER':
    default:
      baseScore = 10;
      explanation.push(`${input.type || 'Standard'} base severity: +10 pts`);
      break;
  }

  // 2. Casualties Points (Mutually exclusive tiers, max 40 pts)
  let casualtiesScore = 0;
  const casualties = Math.max(0, input.casualtiesCount || 0);
  if (casualties >= 3) {
    casualtiesScore = 40;
    explanation.push(`Severe casualties (${casualties} victims): +40 pts (tier: 3+)`);
  } else if (casualties >= 1) {
    casualtiesScore = 20;
    explanation.push(`Moderate casualties (${casualties} victim${casualties > 1 ? 's' : ''}): +20 pts (tier: 1-2)`);
  } else {
    explanation.push('No confirmed casualties: +0 pts');
  }

  // 3. Hazard Modifiers (Each distinct signal applied at most once, non-stacking cap of 35 pts)
  let rawHazardsScore = 0;
  const hazards = input.hazards || {};

  if (hazards.toxicChemicalOrHazardous) {
    rawHazardsScore += 25;
    explanation.push('Hazardous / toxic materials confirmed: +25 pts');
  }
  if (hazards.explosionConfirmed) {
    rawHazardsScore += 20;
    explanation.push('Explosion confirmed / blast wave damage: +20 pts');
  }
  if (hazards.trappedPersons) {
    rawHazardsScore += 20;
    explanation.push('Trapped occupants / active technical rescue: +20 pts');
  }
  if (hazards.fireSpreading) {
    rawHazardsScore += 15;
    explanation.push('Active secondary fire propagation: +15 pts');
  }

  const hazardsScore = Math.min(35, rawHazardsScore);
  if (rawHazardsScore > 35) {
    explanation.push(`Hazard modifiers subtotal (${rawHazardsScore} pts) capped at max 35 pts`);
  }

  // 4. Infrastructure Exposure (Max 15 pts)
  let infrastructureScore = 0;
  if (input.infrastructureRisk) {
    infrastructureScore = 15;
    explanation.push('Critical infrastructure zone exposure (transit/expressway/hospital): +15 pts');
  }

  // 5. Hard Capping Rule: Max 100
  const uncappedTotal = baseScore + casualtiesScore + hazardsScore + infrastructureScore;
  const finalScore = Math.min(100, Math.max(0, uncappedTotal));

  if (uncappedTotal > 100) {
    explanation.push(`Calculated points (${uncappedTotal} pts) capped at platform maximum: 100 pts`);
  }

  // 6. Output Severity & Priority Brackets
  let severity: IncidentSeverity;
  let priority: IncidentPriority;

  if (finalScore >= 75) {
    severity = 'CRITICAL';
    priority = 'P1';
  } else if (finalScore >= 50) {
    severity = 'HIGH';
    priority = 'P2';
  } else if (finalScore >= 25) {
    severity = 'MEDIUM';
    priority = 'P3';
  } else {
    severity = 'LOW';
    priority = 'P4';
  }

  return {
    score: finalScore,
    severity,
    priority,
    breakdown: {
      baseScore,
      casualtiesScore,
      hazardsScore,
      infrastructureScore,
    },
    explanation,
  };
};
