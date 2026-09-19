import mongoose, { Schema, Document } from 'mongoose';

export type ResourceType = 'AMBULANCE' | 'FIRE_TRUCK' | 'RESCUE_TEAM' | 'POLICE_UNIT' | 'HAZMAT_UNIT';
export type ResourceStatus = 'AVAILABLE' | 'BUSY' | 'EN_ROUTE' | 'ON_SCENE' | 'MAINTENANCE';

export interface IResource extends Document {
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
  currentIncidentId?: mongoose.Types.ObjectId;
  assignedTeamId?: mongoose.Types.ObjectId;
  assignedVehicleId?: mongoose.Types.ObjectId;
  lastDispatchTime?: Date;
  fuelLevelPercent?: number;
  operationalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    identifier: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['AMBULANCE', 'FIRE_TRUCK', 'RESCUE_TEAM', 'POLICE_UNIT', 'HAZMAT_UNIT'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'BUSY', 'EN_ROUTE', 'ON_SCENE', 'MAINTENANCE'],
      default: 'AVAILABLE',
      required: true,
      index: true,
    },
    baseStation: { type: String, required: true, trim: true },
    zone: { type: String, required: true, index: true },
    currentLocation: {
      type: [Number], // [lng, lat]
      required: true,
    },
    capabilities: [{ type: String }],
    capacity: { type: Number, default: 1 },
    crewCount: { type: Number, default: 2 },
    currentIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
    assignedTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    assignedVehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    lastDispatchTime: { type: Date },
    fuelLevelPercent: { type: Number, default: 100 },
    operationalNotes: { type: String },
  },
  { timestamps: true }
);

// Indexes
ResourceSchema.index({ status: 1, type: 1 });
ResourceSchema.index({ zone: 1, status: 1 });
ResourceSchema.index({ currentLocation: '2dsphere' });

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);
