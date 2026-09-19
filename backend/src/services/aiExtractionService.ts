import { z } from 'zod';
import { IncidentType } from '../models/Incident.js';
import { ResourceType } from '../models/Resource.js';
import { generateStructuredContentWithTimeout } from './geminiService.js';
import { wrapUntrustedInput } from './promptSanitizer.js';

export const AIExtractionSchema = z.object({
  incidentType: z.enum([
    'FIRE',
    'FLOOD',
    'ROAD_ACCIDENT',
    'MEDICAL',
    'INDUSTRIAL_ACCIDENT',
    'BUILDING_COLLAPSE',
    'EARTHQUAKE',
    'OTHER',
  ]),
  confidence: z.number().min(0).max(1),
  casualtyEstimate: z.number().min(0),
  detectedHazards: z.array(z.string()),
  requiredResourceTypes: z.array(
    z.enum(['AMBULANCE', 'FIRE_TRUCK', 'RESCUE_TEAM', 'POLICE_UNIT', 'HAZMAT_UNIT'])
  ),
  keyFacts: z.array(z.string()),
});

export type AIExtractionResult = z.infer<typeof AIExtractionSchema> & {
  extractionMode: 'GEMINI_2_5' | 'DETERMINISTIC_FALLBACK';
};

/**
 * Deterministic fallback entity extraction using Phase 2 rules.
 */
export function extractEntitiesDeterministic(rawText: string): AIExtractionResult {
  const lower = rawText.toLowerCase();

  let incidentType: IncidentType = 'OTHER';
  const requiredResourceTypes: ResourceType[] = [];
  const detectedHazards: string[] = [];
  let casualtyEstimate = 0;

  // Keyword parsing
  if (lower.includes('fire') || lower.includes('blaze') || lower.includes('smoke')) {
    incidentType = 'FIRE';
    requiredResourceTypes.push('FIRE_TRUCK');
    if (lower.includes('spread')) detectedHazards.push('fireSpreading');
  } else if (lower.includes('flood') || lower.includes('water') || lower.includes('submerged')) {
    incidentType = 'FLOOD';
    requiredResourceTypes.push('RESCUE_TEAM');
    detectedHazards.push('waterRising');
  } else if (lower.includes('crash') || lower.includes('accident') || lower.includes('collision')) {
    incidentType = 'ROAD_ACCIDENT';
    requiredResourceTypes.push('AMBULANCE', 'POLICE_UNIT');
  } else if (lower.includes('chemical') || lower.includes('hazmat') || lower.includes('toxic') || lower.includes('gas leak')) {
    incidentType = 'INDUSTRIAL_ACCIDENT';
    requiredResourceTypes.push('HAZMAT_UNIT', 'FIRE_TRUCK');
    detectedHazards.push('toxicChemical');
  } else if (lower.includes('collapse') || lower.includes('rubble') || lower.includes('trapped')) {
    incidentType = 'BUILDING_COLLAPSE';
    requiredResourceTypes.push('RESCUE_TEAM');
    detectedHazards.push('trappedPersons', 'structuralInstability');
  } else if (lower.includes('injured') || lower.includes('victim') || lower.includes('medical') || lower.includes('heart')) {
    incidentType = 'MEDICAL';
    requiredResourceTypes.push('AMBULANCE');
  } else if (lower.includes('earthquake') || lower.includes('quake') || lower.includes('tremor')) {
    incidentType = 'EARTHQUAKE';
    requiredResourceTypes.push('RESCUE_TEAM', 'AMBULANCE');
  }

  if (lower.includes('explosion') || lower.includes('blast')) {
    detectedHazards.push('explosion');
  }
  if (lower.includes('trapped')) {
    if (!detectedHazards.includes('trappedPersons')) detectedHazards.push('trappedPersons');
  }

  // Casualty estimation attempt
  const numbers = lower.match(/\b\d+\b/g);
  if (numbers && (lower.includes('injured') || lower.includes('casualty') || lower.includes('dead') || lower.includes('hurt'))) {
    casualtyEstimate = Math.min(50, parseInt(numbers[0], 10));
  }

  const keyFacts = [
    `Categorized as ${incidentType} based on report text analysis.`,
    detectedHazards.length ? `Hazards identified: ${detectedHazards.join(', ')}.` : 'No critical secondary hazards immediately identified.',
  ];

  return {
    incidentType,
    confidence: 0.75,
    casualtyEstimate,
    detectedHazards,
    requiredResourceTypes,
    keyFacts,
    extractionMode: 'DETERMINISTIC_FALLBACK',
  };
}

/**
 * Extracts incident entities using Gemini 2.5 with prompt injection wrapping and deterministic fallback.
 */
export async function extractIncidentEntities(rawText: string): Promise<AIExtractionResult> {
  const { wrappedText, systemInstruction } = wrapUntrustedInput(rawText);

  const prompt = `${wrappedText}

Extract structural emergency entity data from the untrusted text above.
Return a valid JSON object matching this schema strictly:
{
  "incidentType": "FIRE" | "FLOOD" | "ROAD_ACCIDENT" | "MEDICAL" | "INDUSTRIAL_ACCIDENT" | "BUILDING_COLLAPSE" | "EARTHQUAKE" | "OTHER",
  "confidence": number between 0 and 1,
  "casualtyEstimate": number,
  "detectedHazards": string[],
  "requiredResourceTypes": ("AMBULANCE" | "FIRE_TRUCK" | "RESCUE_TEAM" | "POLICE_UNIT" | "HAZMAT_UNIT")[],
  "keyFacts": string[]
}`;

  const geminiResult = await generateStructuredContentWithTimeout(
    prompt,
    AIExtractionSchema,
    systemInstruction,
    5000
  );

  if (geminiResult) {
    return {
      ...geminiResult,
      extractionMode: 'GEMINI_2_5',
    };
  }

  return extractEntitiesDeterministic(rawText);
}
