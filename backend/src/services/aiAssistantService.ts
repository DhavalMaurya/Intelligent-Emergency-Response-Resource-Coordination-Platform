import { z } from 'zod';
import { Incident } from '../models/Incident.js';
import { Resource } from '../models/Resource.js';
import { Hospital } from '../models/Hospital.js';
import { Report } from '../models/Report.js';
import { generateStructuredContentWithTimeout } from './geminiService.js';
import { wrapUntrustedInput } from './promptSanitizer.js';

export const AIAssistantResponseSchema = z.object({
  answer: z.string(),
  citedIncidents: z.array(z.string()),
  citedResources: z.array(z.string()),
  isDataSufficient: z.boolean(),
});

export type AIAssistantResponse = z.infer<typeof AIAssistantResponseSchema> & {
  engineMode: 'GEMINI_2_5' | 'DETERMINISTIC_FALLBACK';
};

/**
 * Handles conversational queries for the EOC Command Assistant with strict database context grounding.
 */
export async function processAIAssistantQuery(userQuery: string): Promise<AIAssistantResponse> {
  // 1. Fetch system state snapshot from database
  const activeIncidents = await Incident.find({ status: { $ne: 'RESOLVED' } })
    .select('incidentNumber title type severity priority status location casualtiesCount hazardLevel assignedResources')
    .lean();

  const resources = await Resource.find()
    .select('identifier name type status zone currentLocation crewCount')
    .lean();

  const hospitals = await Hospital.find()
    .select('name zone totalBeds availableBeds icuBedsAvailable divertStatus')
    .lean();

  const pendingReportsCount = await Report.countDocuments({ status: 'PENDING_TRIAGE' });

  // Structured DB context
  const dbContext = {
    systemState: {
      activeIncidentCount: activeIncidents.length,
      pendingTriageReportsCount: pendingReportsCount,
      activeIncidents: activeIncidents.map((inc) => ({
        number: inc.incidentNumber,
        title: inc.title,
        type: inc.type,
        severity: inc.severity,
        priority: inc.priority,
        status: inc.status,
        zone: inc.location?.zone,
        address: inc.location?.address,
        casualties: inc.casualtiesCount,
      })),
      resources: resources.map((r) => ({
        identifier: r.identifier,
        name: r.name,
        type: r.type,
        status: r.status,
        zone: r.zone,
        crewCount: r.crewCount,
      })),
      hospitals: hospitals.map((h) => ({
        name: h.name,
        zone: h.zone,
        bedsAvailable: h.availableBeds,
        icuBedsAvailable: h.icuAvailable,
        divertStatus: h.status === 'DIVERT_STATUS',
      })),
    },
  };

  const jsonContext = JSON.stringify(dbContext, null, 2);

  const { wrappedText } = wrapUntrustedInput(userQuery);

  const systemInstruction = `You are SENTINEL AI Command Assistant, an operational query assistant for civil Emergency Operations Centers (EOC).
CRITICAL GROUNDING CONSTRAINT:
You MUST answer strictly using the system database context provided below.
If the requested information is missing or not present in the provided system records, you MUST set isDataSufficient to false and respond:
"Insufficient data available in system records to answer this query."

Do NOT attempt to guess, extrapolate, or use outside knowledge. Answer factually based only on the system state JSON.`;

  const prompt = `CURRENT SYSTEM DATABASE SNAPSHOT:
${jsonContext}

USER OPERATIONAL QUERY:
${wrappedText}

Return ONLY a JSON object matching this schema strictly:
{
  "answer": "Grounded answer text (or 'Insufficient data available in system records to answer this query.')",
  "citedIncidents": ["INC-XXX", ...],
  "citedResources": ["ENG-XX", ...],
  "isDataSufficient": boolean
}`;

  const geminiResult = await generateStructuredContentWithTimeout(
    prompt,
    AIAssistantResponseSchema,
    systemInstruction,
    5000
  );

  if (geminiResult) {
    return {
      ...geminiResult,
      engineMode: 'GEMINI_2_5',
    };
  }

  // Deterministic fallback response engine
  return processDeterministicAssistantQuery(userQuery, activeIncidents, resources, hospitals, pendingReportsCount);
}

function processDeterministicAssistantQuery(
  userQuery: string,
  activeIncidents: any[],
  resources: any[],
  hospitals: any[],
  pendingReportsCount: number
): AIAssistantResponse {
  const lower = userQuery.toLowerCase();

  const citedIncidents: string[] = [];
  const citedResources: string[] = [];

  if (lower.includes('incident') || lower.includes('active') || lower.includes('p1') || lower.includes('critical')) {
    const p1List = activeIncidents.filter((i) => i.priority === 'P1' || i.severity === 'CRITICAL');
    citedIncidents.push(...p1List.map((i) => i.incidentNumber));

    const answer = `There are currently ${activeIncidents.length} active incident(s) registered in SENTINEL. ${
      p1List.length
    } critical/P1 incident(s) identified: ${
      p1List.length > 0 ? p1List.map((i) => `${i.incidentNumber} (${i.title} in ${i.location?.zone})`).join(', ') : 'None'
    }. Pending report triage queue contains ${pendingReportsCount} report(s).`;

    return {
      answer,
      citedIncidents,
      citedResources: [],
      isDataSufficient: true,
      engineMode: 'DETERMINISTIC_FALLBACK',
    };
  }

  if (lower.includes('resource') || lower.includes('available') || lower.includes('truck') || lower.includes('hazmat') || lower.includes('unit')) {
    const avail = resources.filter((r) => r.status === 'AVAILABLE');
    citedResources.push(...avail.map((r) => r.identifier || r.callSign));

    const answer = `SENTINEL Fleet Status: ${avail.length} of ${resources.length} resource unit(s) are currently AVAILABLE. Key available units: ${avail
      .map((r) => `${r.identifier || r.callSign} (${r.type} - Zone ${r.zone})`)
      .slice(0, 5)
      .join(', ')}.`;

    return {
      answer,
      citedIncidents: [],
      citedResources,
      isDataSufficient: true,
      engineMode: 'DETERMINISTIC_FALLBACK',
    };
  }

  if (lower.includes('hospital') || lower.includes('bed') || lower.includes('icu')) {
    const availBedsTotal = hospitals.reduce((sum, h) => sum + (h.availableBeds || 0), 0);
    const answer = `Regional Medical Capacity: ${hospitals.length} facility(ies) monitored. Total available hospital beds: ${availBedsTotal}. Hospital status breakdown: ${hospitals
      .map((h) => `${h.name} (${h.availableBeds} beds available, ICU ${h.icuBedsAvailable})`)
      .join('; ')}.`;

    return {
      answer,
      citedIncidents: [],
      citedResources: [],
      isDataSufficient: true,
      engineMode: 'DETERMINISTIC_FALLBACK',
    };
  }

  return {
    answer: 'Insufficient data available in system records to answer this query.',
    citedIncidents: [],
    citedResources: [],
    isDataSufficient: false,
    engineMode: 'DETERMINISTIC_FALLBACK',
  };
}
