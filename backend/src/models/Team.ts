import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  teamName: string;
  callSign: string;
  specialization: 'FIRE_SUPPRESSION' | 'PARAMEDIC_EMS' | 'SEARCH_AND_RESCUE' | 'HAZMAT' | 'POLICE_TACTICAL';
  leaderName: string;
  memberCount: number;
  contactFrequency: string;
  currentIncidentId?: mongoose.Types.ObjectId;
  assignedResourceId?: mongoose.Types.ObjectId;
  status: 'STANDBY' | 'DEPLOYED' | 'RESTING';
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    teamName: { type: String, required: true, trim: true },
    callSign: { type: String, required: true, unique: true, index: true },
    specialization: {
      type: String,
      enum: ['FIRE_SUPPRESSION', 'PARAMEDIC_EMS', 'SEARCH_AND_RESCUE', 'HAZMAT', 'POLICE_TACTICAL'],
      required: true,
    },
    leaderName: { type: String, required: true },
    memberCount: { type: Number, default: 4 },
    contactFrequency: { type: String, default: '154.280 MHz' },
    currentIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
    assignedResourceId: { type: Schema.Types.ObjectId, ref: 'Resource' },
    status: {
      type: String,
      enum: ['STANDBY', 'DEPLOYED', 'RESTING'],
      default: 'STANDBY',
      index: true,
    },
  },
  { timestamps: true }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
