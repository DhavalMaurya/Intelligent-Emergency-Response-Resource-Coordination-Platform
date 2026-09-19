import mongoose, { Schema, Document } from 'mongoose';

export type ReportSource = 'CITIZEN' | 'OPERATOR_CALL' | 'SENSOR' | 'FIELD_TEAM';

export interface IReport extends Document {
  source: ReportSource;
  rawText: string;
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
    coordinates?: [number, number];
  };
  mediaUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    source: {
      type: String,
      enum: ['CITIZEN', 'OPERATOR_CALL', 'SENSOR', 'FIELD_TEAM'],
      required: true,
      index: true,
    },
    rawText: { type: String, required: true },
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
      coordinates: [{ type: Number }],
    },
    mediaUrls: [{ type: String }],
  },
  { timestamps: true }
);

ReportSchema.index({ incidentRef: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
