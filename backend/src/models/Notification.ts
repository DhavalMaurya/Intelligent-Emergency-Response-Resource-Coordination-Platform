import mongoose, { Schema, Document } from 'mongoose';

export type NotificationLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type NotificationType = 'DELAY_BREACH' | 'RESOURCE_SHORTAGE' | 'ESCALATION' | 'HAZARD_ALERT' | 'SYSTEM_ALERT';

export interface INotification extends Document {
  recipientRole?: string;
  recipientId?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  level: NotificationLevel;
  type: NotificationType;
  relatedIncidentId?: mongoose.Types.ObjectId;
  relatedResourceId?: mongoose.Types.ObjectId;
  zone?: string;
  acknowledged: boolean;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientRole: { type: String, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    level: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['DELAY_BREACH', 'RESOURCE_SHORTAGE', 'ESCALATION', 'HAZARD_ALERT', 'SYSTEM_ALERT'],
      default: 'SYSTEM_ALERT',
      required: true,
      index: true,
    },
    relatedIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident', index: true },
    relatedResourceId: { type: Schema.Types.ObjectId, ref: 'Resource' },
    zone: { type: String },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ acknowledged: 1, level: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
