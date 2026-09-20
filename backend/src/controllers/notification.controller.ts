import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification.js';
import { Incident } from '../models/Incident.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../server.js';

export const getNotificationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { acknowledged, level, type, zone, limit } = req.query;

    const filter: any = {};
    if (acknowledged !== undefined) {
      filter.acknowledged = acknowledged === 'true';
    }
    if (level) {
      filter.level = level;
    }
    if (type) {
      filter.type = type;
    }
    if (zone) {
      filter.zone = zone;
    }

    const limitNum = parseInt(limit as string, 10) || 50;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('relatedIncidentId', 'incidentNumber title severity priority status location')
      .populate('acknowledgedBy', 'name email role')
      .lean();

    const unacknowledgedCount = await Notification.countDocuments({ acknowledged: false });

    res.json({
      success: true,
      data: {
        unacknowledgedCount,
        notifications,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const acknowledgeNotificationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new AppError(`Notification not found with ID: ${id}`, 404, 'NOT_FOUND');
    }

    notification.acknowledged = true;
    notification.acknowledgedBy = user.id as any;
    notification.acknowledgedAt = new Date();
    await notification.save();

    // Log Audit Entry if tied to an incident
    if (notification.relatedIncidentId) {
      await IncidentUpdate.create({
        incidentId: notification.relatedIncidentId,
        actorId: user.id,
        actorName: user.name || 'EOC Operator',
        actorRole: user.role,
        action: 'NOTIFICATION_ACKNOWLEDGE',
        summary: `Notification acknowledged: "${notification.title}"`,
        reason: `Operator ${user.name} acknowledged system alert.`,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

export const manualEscalateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { incidentId } = req.params;
    const { reason } = req.body;
    const user = req.user;
    if (!user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      throw new AppError(`Incident not found with ID: ${incidentId}`, 404, 'NOT_FOUND');
    }

    incident.status = 'ESCALATED';
    incident.escalationReason = reason || `Manual supervisor escalation triggered by ${user.name}`;
    await incident.save();

    // Create Notification Document
    const notification = await Notification.create({
      title: `SUPERVISOR ESCALATION: ${incident.incidentNumber}`,
      message: `Incident ${incident.incidentNumber} (${incident.title}) manually escalated by ${user.name} (${user.role}). Note: "${incident.escalationReason}"`,
      level: 'CRITICAL',
      type: 'ESCALATION',
      relatedIncidentId: incident._id,
      zone: incident.location?.zone,
      acknowledged: false,
    });

    // Create Audit Entry
    await IncidentUpdate.create({
      incidentId: incident._id,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'MANUAL_ESCALATION',
      summary: `Manual supervisor escalation initiated by ${user.name}`,
      reason: incident.escalationReason,
      timestamp: new Date(),
    });

    // Broadcast Socket.IO Events
    if (io) {
      io.emit('incident.status.updated', {
        incidentId: String(incident._id),
        incidentNumber: incident.incidentNumber,
        status: 'ESCALATED',
        escalationReason: incident.escalationReason,
        timestamp: new Date(),
      });

      io.emit('notification.created', {
        notificationId: String(notification._id),
        title: notification.title,
        message: notification.message,
        level: notification.level,
        type: notification.type,
        relatedIncidentId: String(incident._id),
        zone: notification.zone,
        createdAt: notification.createdAt,
      });

      io.emit('alert.created', {
        id: String(notification._id),
        title: notification.title,
        message: notification.message,
        level: 'CRITICAL',
        type: 'SUPERVISOR_ESCALATION',
        relatedIncidentId: String(incident._id),
        incidentNumber: incident.incidentNumber,
        zone: incident.location?.zone,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        incident,
        notification,
      },
    });
  } catch (err) {
    next(err);
  }
};
