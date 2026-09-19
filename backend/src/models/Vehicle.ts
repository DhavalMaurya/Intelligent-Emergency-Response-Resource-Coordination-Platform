import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
  registrationNumber: string;
  vehicleType: 'AMBULANCE_VAN' | 'FIRE_ENGINE' | 'LADDER_TRUCK' | 'RESCUE_BOAT' | 'HAZMAT_TENDER' | 'PATROL_CAR';
  makeModel: string;
  year: number;
  equipmentList: string[];
  fuelLevelPercent: number;
  maintenanceStatus: 'GOOD' | 'DUE_FOR_SERVICE' | 'OUT_OF_SERVICE';
  assignedResourceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    registrationNumber: { type: String, required: true, unique: true, index: true },
    vehicleType: {
      type: String,
      enum: ['AMBULANCE_VAN', 'FIRE_ENGINE', 'LADDER_TRUCK', 'RESCUE_BOAT', 'HAZMAT_TENDER', 'PATROL_CAR'],
      required: true,
    },
    makeModel: { type: String, required: true },
    year: { type: Number, default: 2023 },
    equipmentList: [{ type: String }],
    fuelLevelPercent: { type: Number, default: 100 },
    maintenanceStatus: {
      type: String,
      enum: ['GOOD', 'DUE_FOR_SERVICE', 'OUT_OF_SERVICE'],
      default: 'GOOD',
      index: true,
    },
    assignedResourceId: { type: Schema.Types.ObjectId, ref: 'Resource' },
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
