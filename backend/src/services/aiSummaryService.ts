import { z } from 'zod';
import { IIncident } from '../models/Incident.js';
import { Report } from '../models/Report.js';
import { generateStructuredContentWithTimeout } from './geminiService.js';
import { wrapUntrustedInput } from './promptSanitizer.js';

export const AISummarySchema = z.object({
  operationalOverview: z.string(),
  confirmedFacts: z.array(z.string()),
  keyRisks: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export type AISummaryResult = z.infer<typeof AISummarySchema> & {
  summaryMode: 'GEMINI_2_5' | 'DETERMINISTIC_FALLBACK';
};

/**
 * Deterministic fallback summary when Gemini is unavailable.
 */
export function generateDeterministicSummary(
  incident: IIncident,
  linkedReports: any[]
): AISummaryResult {
  const count = linkedReports.length;
  const overview = `Incident ${incident.incidentNumber} (${incident.type}) reported in ${incident.location.zone} with severity ${incident.severity}. Currently linked with ${count} civilian report(s) and sensor telemetry updates.`;

  const confirmedFacts = [
    `Incident location verified at ${incident.location.address} (${incident.location.zone}).`,
    `Current status: ${incident.status}, Priority: ${incident.priority}.`,
    `Reported casualties count: ${incident.casualtiesCount}.`,
  ];

  if (incident.telemetryReadings && incident.telemetryReadings.length > 0) {
    const latestSensor = incident.telemetryReadings[incident.telemetryReadings.length - 1];
    confirmedFacts.push(
      `Latest sensor reading (${latestSensor.sensorType} / ${latestSensor.sensorCode}): ${latestSensor.reading} ${latestSensor.unit}.`
    );
  }

  const keyRisks = [
    `Hazard level assessed as ${incident.hazardLevel}.`,
    `Resource availability in ${incident.location.zone} must be maintained for secondary escalation.`,
  ];

  const uncertainties = [
    `Field verification ongoing for exact extent of structural or peripheral impact.`,
    count > 0 ? `Evaluating ${count} citizen report(s) for supplementary field details.` : 'Awaiting additional caller updates.',
  ];

  return {
    operationalOverview: overview,
    confirmedFacts,
    keyRisks,
    uncertainties,
    summaryMode: 'DETERMINISTIC_FALLBACK',
  };
}

/**
 * Generates grounded incident situation summary using Gemini 2.5 with prompt sanitization.
 */
export async function generateIncidentSummary(incident: IIncident): Promise<AISummaryResult> {
  const linkedReports = await Report.find({ _id: { $in: incident.linkedReportIds || [] } }).lean();

  // Construct structured database context
  const contextData = {
    incidentNumber: incident.incidentNumber,
    title: incident.title,
    description: incident.description,
    type: incident.type,
    severity: incident.severity,
    priority: incident.priority,
    status: incident.status,
    zone: incident.location.zone,
    address: incident.location.address,
    casualtiesCount: incident.casualtiesCount,
    hazardLevel: incident.hazardLevel,
    telemetryReadings: incident.telemetryReadings || [],
    linkedReports: linkedReports.map((r) => ({
      reportNumber: r.reportNumber,
      source: r.source,
      rawText: r.rawText,
      verified: r.verified,
      createdAt: r.createdAt,
    })),
  };

  const jsonContextStr = JSON.stringify(contextData, null, 2);
  const { wrappedText, systemInstruction } = wrapUntrustedInput(jsonContextStr);

  const prompt = `${wrappedText}

Generate a concise, grounded operational briefing based STRICTLY on the database records above.
DO NOT hallucinate facts not supported by the input context.

Return ONLY a valid JSON object matching this schema:
{
  "operationalOverview": "2-sentence executive briefing",
  "confirmedFacts": ["Fact 1", "Fact 2"],
  "keyRisks": ["Risk 1", "Risk 2"],
  "uncertainties": ["Uncertainty 1", "Uncertainty 2"]
}`;

  const result = await generateStructuredContentWithTimeout(
    prompt,
    AISummarySchema,
    systemInstruction,
    5000
  );

  if (result) {
    return {
      ...result,
      summaryMode: 'GEMINI_2_5',
    };
  }

  return generateDeterministicSummary(incident, linkedReports);
}
