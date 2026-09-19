import mongoose, { Schema, Document } from 'mongoose';

export type ReportSource = 'CITIZEN' | 'OPERATOR_CALL' | 'SENSOR' | 'FIELD_TEAM';
export type ReportStatus = 'PENDING_TRIAGE' | 'VERIFIED' | 'LINKED' | 'DISMISSED';

export interface IReport extends Document {
  reportNumber: string;
  source: ReportSource;
  rawText: string;
  category?: string;
  status: ReportStatus;
  confidenceScore?: number;
  duplicateOf?: mongoose.Types.ObjectId;
  callerInfo?: {
    name?: string;
    phone?: string;
    locationDescription?: string;
  };
  reporterContact?: string;
  verified: boolean;
  incidentRef?: mongoose.Types.ObjectId;
  location?: {
    address: string;
    zone?: string;
    coordinates?: [number, number];
  };
  mediaUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportNumber: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      enum: ['CITIZEN', 'OPERATOR_CALL', 'SENSOR', 'FIELD_TEAM'],
      required: true,
      index: true,
    },
    rawText: { type: String, required: true },
    category: { type: String, default: 'OTHER' },
    status: {
      type: String,
      enum: ['PENDING_TRIAGE', 'VERIFIED', 'LINKED', 'DISMISSED'],
      default: 'PENDING_TRIAGE',
      index: true,
    },
    confidenceScore: { type: Number },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Report' },
    callerInfo: {
      name: { type: String },
      phone: { type: String },
      locationDescription: { type: String },
    },
    reporterContact: { type: String },
    verified: { type: Boolean, default: false, index: true },
    incidentRef: { type: Schema.Types.ObjectId, ref: 'Incident', index: true },
    location: {
      address: { type: String },
      zone: { type: String },
      coordinates: [{ type: Number }],
    },
    mediaUrls: [{ type: String }],
  },
  { timestamps: true }
);

ReportSchema.index({ incidentRef: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
