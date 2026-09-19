export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CONTROL_ROOM' | 'OPERATOR' | 'FIELD_TEAM' | 'HOSPITAL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentType =
  | 'FIRE'
  | 'FLOOD'
  | 'ROAD_ACCIDENT'
  | 'MEDICAL'
  | 'INDUSTRIAL_ACCIDENT'
  | 'BUILDING_COLLAPSE'
  | 'EARTHQUAKE'
  | 'OTHER';

export type IncidentStatus =
  | 'ACTIVE'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'DELAYED'
  | 'MERGED';

export interface Incident {
  _id: string;
  incidentNumber: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: Severity;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: IncidentStatus;
  location: {
    address: string;
    zone: string;
    coordinates: [number, number]; // [lng, lat]
  };
  casualtiesCount: number;
  hazardLevel: string;
  tags: string[];
  assignedResources: Resource[];
  linkedReportIds?: string[];
  mergedIntoIncidentId?: string;
  telemetryReadings?: Array<{
    sensorCode: string;
    sensorType: string;
    reading: number;
    unit: string;
    timestamp: string;
  }>;
  aiSummary?: string;
  responseMetrics?: {
    detectionTimestamp?: string;
    dispatchedTimestamp?: string;
    arrivedTimestamp?: string;
    resolvedTimestamp?: string;
    dispatchDelayMinutes?: number;
    totalResponseMinutes?: number;
  };
  escalationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  _id: string;
  reportNumber: string;
  source: 'CITIZEN' | 'OPERATOR_CALL' | 'SENSOR' | 'FIELD_TEAM';
  rawText: string;
  category?: string;
  status: 'PENDING_TRIAGE' | 'VERIFIED' | 'LINKED' | 'DISMISSED';
  confidenceScore?: number;
  verified?: boolean;
  incidentRef?: any;
  location?: {
    address: string;
    zone?: string;
    coordinates?: [number, number];
  };
  callerInfo?: {
    name?: string;
    phone?: string;
    locationDescription?: string;
  };
  mediaUrls?: string[];
  createdAt: string;
}

export type ResourceType = 'AMBULANCE' | 'FIRE_TRUCK' | 'RESCUE_TEAM' | 'POLICE_UNIT' | 'HAZMAT_UNIT';
export type ResourceStatus = 'AVAILABLE' | 'BUSY' | 'EN_ROUTE' | 'ON_SCENE' | 'MAINTENANCE';

export interface Resource {
  _id: string;
  identifier: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  baseStation: string;
  zone: string;
  currentLocation: [number, number]; // [lng, lat]
  capabilities: string[];
  capacity: number;
  crewCount: number;
  currentIncidentId?: any;
  fuelLevelPercent?: number;
  operationalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sensor {
  _id: string;
  sensorCode: string;
  type: 'SMOKE' | 'TEMPERATURE' | 'WATER_LEVEL' | 'GAS_HAZARD';
  zone: string;
  location: [number, number];
  currentReading: number;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  lastPing: string;
}

export interface AuditEntry {
  _id: string;
  incidentId: string;
  actorName: string;
  actorRole: string;
  action: 'ACKNOWLEDGE' | 'ASSIGN_RESOURCE' | 'UNASSIGN_RESOURCE' | 'CHANGE_SEVERITY' | 'ESCALATE' | 'RESOLVE' | 'STATUS_CHANGE' | 'FIELD_NOTE' | 'DISPATCH_ORDER';
  summary: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  timestamp: string;
}

export interface AlertNotification {
  _id: string;
  title: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'DELAY_BREACH' | 'RESOURCE_SHORTAGE' | 'ESCALATION' | 'HAZARD_ALERT' | 'SYSTEM_ALERT';
  relatedIncidentId?: string;
  zone?: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface GlobalFilterState {
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
  severity: 'ALL' | Severity;
  type: 'ALL' | IncidentType;
  status: 'ALL' | IncidentStatus;
  zone: 'ALL' | string;
  resourceType: 'ALL' | ResourceType;
}

export interface KPIOverview {
  activeIncidents: number;
  criticalIncidents: number;
  highPriorityIncidents: number;
  delayedResponses: number;
  availableResources: number;
  resourcesInUse: number;
  escalatedIncidents: number;
  averageResponseTime: number;
  targetThresholdMinutes: number;
}

export interface SystemHealth {
  status: 'OPERATIONAL' | 'DEGRADED';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    api: {
      status: 'OPERATIONAL' | 'DEGRADED';
      version: string;
      port: number;
    };
    database: {
      service: string;
      status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
      latencyMs?: number;
      databaseName?: string;
      error?: string;
    };
    cacheAndQueues: {
      service: string;
      status: 'READY' | 'CONNECTING' | 'DISCONNECTED' | 'NOT_CONFIGURED';
      latencyMs?: number;
      error?: string;
    };
    realtime: {
      service: string;
      status: 'ACTIVE' | 'CONNECTING' | 'DISCONNECTED';
      connectedClientsCount: number;
    };
    aiEngine: {
      service: string;
      status: 'NOT_CONFIGURED' | 'CONFIGURED' | 'AVAILABLE_HEALTHY';
      model: string;
      embeddingModel: string;
      phaseTarget: string;
    };
  };
  thresholds: {
    targetResponseTimeMinutes: number;
    criticalDispatchTimeoutMinutes: number;
  };
}
