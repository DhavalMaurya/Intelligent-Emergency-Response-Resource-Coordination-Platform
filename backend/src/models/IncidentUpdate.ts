import mongoose, { Schema, Document } from 'mongoose';

export type OperatorAction =
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
  | 'TELEMETRY_UPDATE';

export interface IIncidentUpdate extends Document {
  incidentId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: OperatorAction;
  summary: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentUpdateSchema = new Schema<IIncidentUpdate>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, required: true, default: 'Dispatch Operator' },
    actorRole: { type: String, required: true, default: 'OPERATOR' },
    action: {
      type: String,
      enum: [
        'ACKNOWLEDGE',
        'ASSIGN_RESOURCE',
        'UNASSIGN_RESOURCE',
        'CHANGE_SEVERITY',
        'ESCALATE',
        'RESOLVE',
        'STATUS_CHANGE',
        'FIELD_NOTE',
        'DISPATCH_ORDER',
        'LINK_REPORT',
        'MERGE_INCIDENT',
        'TELEMETRY_UPDATE',
      ],
      required: true,
      index: true,
    },
    summary: { type: String, required: true },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

IncidentUpdateSchema.index({ incidentId: 1, timestamp: -1 });

export const IncidentUpdate = mongoose.model<IIncidentUpdate>('IncidentUpdate', IncidentUpdateSchema);
