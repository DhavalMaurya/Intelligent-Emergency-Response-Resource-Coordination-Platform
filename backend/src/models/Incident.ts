import mongoose, { Schema, Document } from 'mongoose';

export type IncidentType =
  | 'FIRE'
  | 'FLOOD'
  | 'ROAD_ACCIDENT'
  | 'MEDICAL'
  | 'INDUSTRIAL_ACCIDENT'
  | 'BUILDING_COLLAPSE'
  | 'EARTHQUAKE'
  | 'OTHER';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';
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

export interface ITelemetryReading {
  sensorCode: string;
  sensorType: string;
  reading: number;
  unit: string;
  timestamp: Date;
}

export interface IIncident extends Document {
  incidentNumber: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  status: IncidentStatus;
  location: {
    address: string;
    zone: string;
    coordinates: [number, number]; // [lng, lat]
  };
  casualtiesCount: number;
  hazardLevel: string;
  tags: string[];
  assignedResources: mongoose.Types.ObjectId[];
  primaryReporterId?: mongoose.Types.ObjectId;
  linkedReportIds: mongoose.Types.ObjectId[];
  mergedIntoIncidentId?: mongoose.Types.ObjectId;
  telemetryReadings: ITelemetryReading[];
  aiSummary?: string;
  responseMetrics: {
    detectionTimestamp: Date;
    dispatchedTimestamp?: Date;
    arrivedTimestamp?: Date;
    resolvedTimestamp?: Date;
    dispatchDelayMinutes?: number;
    totalResponseMinutes?: number;
  };
  escalationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    incidentNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['FIRE', 'FLOOD', 'ROAD_ACCIDENT', 'MEDICAL', 'INDUSTRIAL_ACCIDENT', 'BUILDING_COLLAPSE', 'EARTHQUAKE', 'OTHER'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      default: 'P2',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'UNDER_REVIEW', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED', 'ESCALATED', 'DELAYED', 'MERGED'],
      default: 'ACTIVE',
      index: true,
    },
    location: {
      address: { type: String, required: true },
      zone: { type: String, required: true, index: true },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    casualtiesCount: { type: Number, default: 0 },
    hazardLevel: { type: String, default: 'STANDARD' },
    tags: [{ type: String }],
    assignedResources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],
    primaryReporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    linkedReportIds: [{ type: Schema.Types.ObjectId, ref: 'Report' }],
    mergedIntoIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
    telemetryReadings: [
      {
        sensorCode: { type: String, required: true },
        sensorType: { type: String, required: true },
        reading: { type: Number, required: true },
        unit: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    aiSummary: { type: String },
    responseMetrics: {
      detectionTimestamp: { type: Date, default: Date.now },
      dispatchedTimestamp: { type: Date },
      arrivedTimestamp: { type: Date },
      resolvedTimestamp: { type: Date },
      dispatchDelayMinutes: { type: Number },
      totalResponseMinutes: { type: Number },
    },
    escalationReason: { type: String },
  },
  { timestamps: true }
);

// Explicit High-Performance Compound & Geospatial Indexes
IncidentSchema.index({ createdAt: -1 });
IncidentSchema.index({ severity: 1, status: 1 });
IncidentSchema.index({ type: 1, 'location.zone': 1 });
IncidentSchema.index({ 'location.coordinates': '2dsphere' });

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
