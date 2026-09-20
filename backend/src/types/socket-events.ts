export interface ReportDTO {
  id: string;
  reportNumber: string;
  source: 'CITIZEN' | 'OPERATOR_CALL' | 'SENSOR' | 'FIELD_TEAM';
  rawText: string;
  category?: string;
  status: 'PENDING_TRIAGE' | 'VERIFIED' | 'LINKED' | 'DISMISSED';
  confidenceScore?: number;
  incidentRef?: string;
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
  createdAt: string;
}

export interface IncidentDTO {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  type: 'FIRE' | 'FLOOD' | 'ROAD_ACCIDENT' | 'MEDICAL' | 'INDUSTRIAL_ACCIDENT' | 'BUILDING_COLLAPSE' | 'EARTHQUAKE' | 'OTHER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED' | 'ESCALATED' | 'DELAYED' | 'MERGED';
  location: {
    address: string;
    zone: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  casualtiesCount: number;
  hazardLevel: string;
  tags: string[];
  assignedResources: string[];
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
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDTO {
  id: string;
  identifier: string;
  name: string;
  type: 'AMBULANCE' | 'FIRE_TRUCK' | 'RESCUE_TEAM' | 'POLICE_UNIT' | 'HAZMAT_UNIT';
  status: 'AVAILABLE' | 'BUSY' | 'EN_ROUTE' | 'ON_SCENE' | 'MAINTENANCE';
  baseStation: string;
  currentLocation: [number, number];
  capabilities: string[];
  capacity: number;
  currentIncidentId?: string;
  zone: string;
}

export interface AuditEntryDTO {
  id: string;
  incidentId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action:
    | 'ACKNOWLEDGE'
    | 'ASSIGN_RESOURCE'
    | 'UNASSIGN_RESOURCE'
    | 'CHANGE_SEVERITY'
    | 'ESCALATE'
    | 'RESOLVE'
    | 'STATUS_CHANGE'
    | 'FIELD_NOTE'
    | 'DISPATCH_ORDER'
    | 'LINK_REPORT'
    | 'MERGE_INCIDENT'
    | 'TELEMETRY_UPDATE'
    | 'NOTIFICATION_ACKNOWLEDGE'
    | 'MANUAL_ESCALATION';
  summary: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  timestamp: string;
}

export interface AlertNotificationDTO {
  id: string;
  title: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'DELAY_BREACH' | 'RESOURCE_SHORTAGE' | 'ESCALATION' | 'HAZARD_ALERT' | 'SENSOR_ALERT' | 'CRITICAL_DELAY' | 'SUPERVISOR_ESCALATION';
  relatedIncidentId?: string;
  incidentNumber?: string;
  zone?: string;
  createdAt?: string;
  timestamp?: any;
}

export interface SystemHealthDTO {
  api: 'OPERATIONAL' | 'DEGRADED';
  database: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  dbLatencyMs?: number;
  redis: 'READY' | 'CONNECTING' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  socket: 'ACTIVE' | 'CONNECTING' | 'DISCONNECTED';
  gemini: 'NOT_CONFIGURED' | 'CONFIGURED' | 'AVAILABLE_HEALTHY';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ServerToClientEvents {
  'incident.created': (incident: IncidentDTO) => void;
  'incident.updated': (update: { incidentId: string; changes: Partial<IncidentDTO>; audit?: AuditEntryDTO }) => void;
  'incident.correlated': (payload: { masterIncidentId: string; reportId?: string; mergedIncidentId?: string; newReportCount: number; message: string }) => void;
  'incident.severity.updated': (payload: { incidentId: string; incidentNumber?: string; previousSeverity?: string; newSeverity: string; newPriority?: string; score?: number; explanation?: string[]; reason?: string; timestamp?: any }) => void;
  'incident.status.updated': (payload: { incidentId: string | any; incidentNumber?: string; previousStatus?: string; status?: string; newStatus?: string; escalationReason?: string; timestamp?: any }) => void;
  'report.created': (report: ReportDTO) => void;
  'report.linked': (payload: { reportId: string; incidentId: string }) => void;
  'sensor.reading': (payload: { sensorCode: string; reading: number; unit: string; status: string; zone: string; incidentId?: string }) => void;
  'resource.assigned': (payload: { incidentId: string; resourceId: string; callSign: string; status: string; timestamp: Date }) => void;
  'resource.updated': (resource: Partial<ResourceDTO> | any) => void;
  'notification.created': (notification: any) => void;
  'alert.created': (alert: AlertNotificationDTO) => void;
  'system.health.updated': (health: SystemHealthDTO) => void;
}

export interface ClientToServerEvents {
  'subscribe.zone': (zone: string) => void;
  'unsubscribe.zone': (zone: string) => void;
}
