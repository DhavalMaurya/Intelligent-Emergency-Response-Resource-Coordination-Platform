import { IIncident } from '../models/Incident.js';
import { IResource, ResourceType } from '../models/Resource.js';
import { generateContentWithTimeout } from './geminiService.js';
import { calculateHaversineDistanceMeters } from './correlationEngine.js';

export interface ResourceRecommendationItem {
  resourceId: string;
  callSign: string;
  name: string;
  type: ResourceType;
  status: string;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  scoreBreakdown: {
    proximityScore: number;
    capabilityScore: number;
    statusAndCapacityScore: number;
    sectorScore: number;
  };
  aiExplanation: string;
}

/**
 * Calculates physics-based Urban Speed ETA:
 * ETA = Math.round((Distance in km / 35 km/h) * 60) + 2 minutes turnout delay.
 */
export function calculateUrbanSpeedEtaMinutes(distanceKm: number): number {
  const travelMinutes = (distanceKm / 35) * 60;
  return Math.max(2, Math.round(travelMinutes) + 2);
}

/**
 * Evaluates available resources against incident requirements and ranks them strictly capped at 100 points.
 */
export async function generateRankedResourceRecommendations(
  incident: IIncident,
  resources: IResource[],
  requiredType?: ResourceType
): Promise<ResourceRecommendationItem[]> {
  const incidentCoords = incident.location.coordinates;
  const targetType = requiredType || mapIncidentTypeToResourceType(incident.type);

  const scoredList: ResourceRecommendationItem[] = [];

  for (const res of resources) {
    const callSign = res.identifier || (res as any).callSign || 'UNIT-UNKNOWN';
    const zone = res.zone || (res as any).assignedZone || '';
    const resCoords: [number, number] =
      res.currentLocation && res.currentLocation.length === 2
        ? res.currentLocation
        : (res as any).location?.coordinates || incidentCoords;

    const crewCount = res.crewCount || (res as any).capacity?.crewCount || 2;

    const distanceMeters = calculateHaversineDistanceMeters(incidentCoords, resCoords);
    const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));

    // 1. Proximity Score (Max 40 pts)
    let proximityScore = 5;
    if (distanceKm <= 1.0) proximityScore = 40;
    else if (distanceKm <= 3.0) proximityScore = 30;
    else if (distanceKm <= 7.0) proximityScore = 20;
    else if (distanceKm <= 15.0) proximityScore = 10;

    // 2. Capability Match Score (Max 30 pts)
    let capabilityScore = 0;
    if (res.type === targetType) {
      capabilityScore = 30;
    } else if (isCompatibleResourceType(res.type, targetType)) {
      capabilityScore = 15;
    }

    // 3. Status & Capacity Subtotal (Max 20 pts: Status 12 pts + Capacity 8 pts)
    const statusPoints = res.status === 'AVAILABLE' ? 12 : 0;
    const capacityPoints = crewCount >= 2 ? 8 : 4;
    const statusAndCapacityScore = Math.min(20, statusPoints + capacityPoints);

    // 4. Sector / Zone Exposure Score (Max 10 pts)
    const sectorScore = zone === incident.location.zone ? 10 : 0;

    // Total Composite Score strictly capped at 100
    const totalScore = Math.min(
      100,
      proximityScore + capabilityScore + statusAndCapacityScore + sectorScore
    );

    // Urban Speed ETA
    const etaMinutes = calculateUrbanSpeedEtaMinutes(distanceKm);

    // Deterministic explanation fallback
    const deterministicExplanation = `${callSign} (${res.type}) scored ${totalScore}/100. Distance: ${distanceKm}km, Estimated arrival: ${etaMinutes} mins. Status: ${res.status}.`;

    scoredList.push({
      resourceId: String(res._id),
      callSign,
      name: res.name,
      type: res.type,
      status: res.status,
      distanceKm,
      etaMinutes,
      score: totalScore,
      scoreBreakdown: {
        proximityScore,
        capabilityScore,
        statusAndCapacityScore,
        sectorScore,
      },
      aiExplanation: deterministicExplanation,
    });
  }

  // Sort descending by total score
  scoredList.sort((a, b) => b.score - a.score);
  const topRecommendations = scoredList.slice(0, 5);

  // Generate Gemini natural language explanations for top 3 units
  try {
    const topContext = topRecommendations.slice(0, 3).map((r) => ({
      callSign: r.callSign,
      type: r.type,
      score: r.score,
      distanceKm: r.distanceKm,
      etaMinutes: r.etaMinutes,
      status: r.status,
    }));

    const prompt = `Incident ${incident.incidentNumber} (${incident.type} in Zone ${incident.location.zone}) requires resource dispatch.
Top candidate units evaluated by scoring engine:
${JSON.stringify(topContext, null, 2)}

Provide a concise 1-sentence operational justification for each top unit explaining why it is recommended. Format as JSON object mapping callSign -> explanation string.`;

    const geminiText = await generateContentWithTimeout(prompt, undefined, 3000);
    if (geminiText) {
      let cleanJson = geminiText.trim();
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.substring(7);
      if (cleanJson.startsWith('```')) cleanJson = cleanJson.substring(3);
      if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.length - 3);

      const parsedObj = JSON.parse(cleanJson.trim());
      for (const item of topRecommendations) {
        if (parsedObj[item.callSign]) {
          item.aiExplanation = parsedObj[item.callSign];
        }
      }
    }
  } catch (err) {
    // Graceful fallback to deterministic explanation
  }

  return topRecommendations;
}

function mapIncidentTypeToResourceType(type: string): ResourceType {
  switch (type) {
    case 'FIRE':
      return 'FIRE_TRUCK';
    case 'MEDICAL':
      return 'AMBULANCE';
    case 'FLOOD':
    case 'BUILDING_COLLAPSE':
    case 'EARTHQUAKE':
      return 'RESCUE_TEAM';
    case 'ROAD_ACCIDENT':
      return 'POLICE_UNIT';
    case 'INDUSTRIAL_ACCIDENT':
      return 'HAZMAT_UNIT';
    default:
      return 'RESCUE_TEAM';
  }
}

function isCompatibleResourceType(resType: string, targetType: string): boolean {
  if (targetType === 'FIRE_TRUCK' && resType === 'HAZMAT_UNIT') return true;
  if (targetType === 'RESCUE_TEAM' && (resType === 'FIRE_TRUCK' || resType === 'AMBULANCE')) return true;
  if (targetType === 'ROAD_ACCIDENT' && (resType === 'AMBULANCE' || resType === 'POLICE_UNIT')) return true;
  return false;
}
