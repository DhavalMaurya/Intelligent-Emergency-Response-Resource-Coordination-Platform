import mongoose, { Schema, Document } from 'mongoose';

export type SensorType = 'SMOKE' | 'TEMPERATURE' | 'WATER_LEVEL' | 'GAS_HAZARD';
export type SensorStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface ISensor extends Document {
  sensorCode: string;
  type: SensorType;
  zone: string;
  location: [number, number]; // [lng, lat]
  currentReading: number;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
  status: SensorStatus;
  lastPing: Date;
  incidentRef?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SensorSchema = new Schema<ISensor>(
  {
    sensorCode: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['SMOKE', 'TEMPERATURE', 'WATER_LEVEL', 'GAS_HAZARD'],
      required: true,
      index: true,
    },
    zone: { type: String, required: true, index: true },
    location: {
      type: [Number],
      required: true,
    },
    currentReading: { type: Number, required: true },
    unit: { type: String, required: true },
    warningThreshold: { type: Number, required: true },
    criticalThreshold: { type: Number, required: true },
    status: {
      type: String,
      enum: ['NORMAL', 'WARNING', 'CRITICAL'],
      default: 'NORMAL',
      index: true,
    },
    lastPing: { type: Date, default: Date.now },
    incidentRef: { type: Schema.Types.ObjectId, ref: 'Incident' },
  },
  { timestamps: true }
);

SensorSchema.index({ location: '2dsphere' });

export const Sensor = mongoose.model<ISensor>('Sensor', SensorSchema);
