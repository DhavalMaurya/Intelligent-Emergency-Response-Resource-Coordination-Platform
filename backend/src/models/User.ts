import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'CONTROL_ROOM' | 'OPERATOR' | 'FIELD_TEAM' | 'HOSPITAL';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
  contactPhone?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['ADMIN', 'CONTROL_ROOM', 'OPERATOR', 'FIELD_TEAM', 'HOSPITAL'],
      default: 'OPERATOR',
      required: true,
      index: true,
    },
    badgeNumber: { type: String, trim: true },
    department: { type: String, trim: true, default: 'Civil Emergency Operations' },
    contactPhone: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
