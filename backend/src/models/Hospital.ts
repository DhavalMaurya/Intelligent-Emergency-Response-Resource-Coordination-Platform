import mongoose, { Schema, Document } from 'mongoose';

export type HospitalStatus = 'NORMAL' | 'HIGH_OCCUPANCY' | 'DIVERT_STATUS';

export interface IHospital extends Document {
  name: string;
  zone: string;
  location: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  traumaLevel: number; // 1, 2, or 3
  totalBeds: number;
  availableBeds: number;
  icuAvailable: number;
  status: HospitalStatus;
  contactPhone?: string;
  lastUpdated: Date;
}

const HospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    zone: { type: String, required: true, index: true },
    location: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (val: number[]) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude] bounds.',
        },
      },
    },
    traumaLevel: { type: Number, required: true, enum: [1, 2, 3], default: 1 },
    totalBeds: { type: Number, required: true, min: 1 },
    availableBeds: { type: Number, required: true, min: 0 },
    icuAvailable: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['NORMAL', 'HIGH_OCCUPANCY', 'DIVERT_STATUS'],
      default: 'NORMAL',
      index: true,
    },
    contactPhone: { type: String },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// 2D geospatial index for nearest hospital spatial queries
HospitalSchema.index({ 'location.coordinates': '2d' });

export const Hospital = mongoose.model<IHospital>('Hospital', HospitalSchema);
