import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  code: string;
  zone: string;
  location: [number, number]; // [lng, lat]
  totalBeds: number;
  availableBeds: number;
  icuBedsTotal: number;
  icuBedsAvailable: number;
  traumaLevel: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'COMMUNITY';
  divertStatus: boolean;
  emergencyPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, index: true },
    zone: { type: String, required: true, index: true },
    location: {
      type: [Number],
      required: true,
    },
    totalBeds: { type: Number, default: 200 },
    availableBeds: { type: Number, default: 45 },
    icuBedsTotal: { type: Number, default: 30 },
    icuBedsAvailable: { type: Number, default: 6 },
    traumaLevel: {
      type: String,
      enum: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'COMMUNITY'],
      default: 'LEVEL_2',
    },
    divertStatus: { type: Boolean, default: false },
    emergencyPhone: { type: String, default: '555-0199' },
  },
  { timestamps: true }
);

HospitalSchema.index({ location: '2dsphere' });

export const Hospital = mongoose.model<IHospital>('Hospital', HospitalSchema);
