export interface IncidentDTO {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  type: 'FIRE' | 'FLOOD' | 'ROAD_ACCIDENT' | 'MEDICAL' | 'INDUSTRIAL_ACCIDENT' | 'BUILDING_COLLAPSE' | 'EARTHQUAKE' | 'OTHER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED' | 'ESCALATED' | 'DELAYED';
  location: {
    address: string;
    zone: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  casualtiesCount: number;
  hazardLevel: string;
  tags: string[];
  assignedResources: string[];
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
  action: 'ACKNOWLEDGE' | 'ASSIGN_RESOURCE' | 'UNASSIGN_RESOURCE' | 'CHANGE_SEVERITY' | 'ESCALATE' | 'RESOLVE' | 'STATUS_CHANGE' | 'FIELD_NOTE' | 'DISPATCH_ORDER';
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
  type: 'DELAY_BREACH' | 'RESOURCE_SHORTAGE' | 'ESCALATION' | 'HAZARD_ALERT';
  relatedIncidentId?: string;
  zone?: string;
  createdAt: string;
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
  'resource.updated': (resource: ResourceDTO) => void;
  'alert.created': (alert: AlertNotificationDTO) => void;
  'system.health.updated': (health: SystemHealthDTO) => void;
}

export interface ClientToServerEvents {
  'subscribe.zone': (zone: string) => void;
  'unsubscribe.zone': (zone: string) => void;
}
