import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Incident } from '../models/Incident.js';
import { Resource } from '../models/Resource.js';
import { Report } from '../models/Report.js';
import { Sensor } from '../models/Sensor.js';
import { IncidentUpdate, OperatorAction } from '../models/IncidentUpdate.js';
import { AppError } from '../middleware/errorHandler.js';
import { scheduleSLAJob, cancelSLAJob } from '../services/slaWorker.js';
import { io } from '../server.js';

export const getIncidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      timeRange,
      severity,
      type,
      status,
      zone,
      search,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query: any = {};

    if (severity && severity !== 'ALL') {
      query.severity = severity;
    }

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (zone && zone !== 'ALL') {
      query['location.zone'] = zone;
    }

    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let hours = 24;
      if (timeRange === '1h') hours = 1;
      else if (timeRange === '6h') hours = 6;
      else if (timeRange === '24h') hours = 24;
      else if (timeRange === '7d') hours = 168;

      query.createdAt = { $gte: new Date(now.getTime() - hours * 60 * 60 * 1000) };
    }

    if (search) {
      const searchStr = String(search).trim();
      query.$or = [
        { title: { $regex: searchStr, $options: 'i' } },
        { incidentNumber: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } },
        { 'location.address': { $regex: searchStr, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField = (sortBy as string) || 'createdAt';

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .populate('assignedResources', 'identifier name type status currentLocation baseStation')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Incident.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getIncidentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    let incident;
    if (mongoose.Types.ObjectId.isValid(id)) {
      incident = await Incident.findById(id).populate('assignedResources');
    } else {
      incident = await Incident.findOne({ incidentNumber: id }).populate('assignedResources');
    }

    if (!incident) {
      throw new AppError('Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    // Retrieve related reports, zone sensors, and complete audit trail
    const [reports, zoneSensors, auditTrail] = await Promise.all([
      Report.find({ incidentRef: incident._id }).sort({ createdAt: -1 }),
      Sensor.find({ zone: incident.location.zone }).limit(6),
      IncidentUpdate.find({ incidentId: incident._id }).sort({ timestamp: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        incident,
        reports,
        zoneSensors,
        auditTrail,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const performIncidentAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { action, reason, resourceId, newSeverity, newStatus, note } = req.body;

    const incident = await Incident.findById(id);
    if (!incident) {
      throw new AppError('Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    const previousState = {
      status: incident.status,
      severity: incident.severity,
      assignedResourcesCount: incident.assignedResources.length,
    };

    const actorName = req.user?.name || 'Authorized Operator';
    const actorRole = req.user?.role || 'OPERATOR';
    const actorId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

    let summary = '';

    // Guarantee detectionTimestamp
    if (!incident.responseMetrics.detectionTimestamp) {
      incident.responseMetrics.detectionTimestamp = incident.createdAt || new Date();
    }

    switch (action as OperatorAction) {
      case 'ACKNOWLEDGE':
        summary = `${actorName} (${actorRole}) acknowledged incident ${incident.incidentNumber}.`;
        if (incident.status === 'ACTIVE') {
          incident.status = 'UNDER_REVIEW';
        }
        break;

      case 'ASSIGN_RESOURCE':
        if (!resourceId) throw new AppError('resourceId is required for assignment', 400, 'BAD_REQUEST');
        const resource = await Resource.findById(resourceId);
        if (!resource) throw new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');

        if (!incident.assignedResources.some((r) => r.toString() === resourceId)) {
          incident.assignedResources.push(resource._id as any);
        }
        resource.status = 'EN_ROUTE';
        resource.currentIncidentId = incident._id as any;
        resource.lastDispatchTime = new Date();
        await resource.save();

        if (incident.status === 'ACTIVE' || incident.status === 'UNDER_REVIEW') {
          incident.status = 'ASSIGNED';
        }

        // Timestamp Lifecycle: set dispatchedTimestamp & compute dispatchDelayMinutes
        if (!incident.responseMetrics.dispatchedTimestamp) {
          incident.responseMetrics.dispatchedTimestamp = new Date();
          const detectTime = new Date(incident.responseMetrics.detectionTimestamp).getTime();
          const dispatchTime = incident.responseMetrics.dispatchedTimestamp.getTime();
          incident.responseMetrics.dispatchDelayMinutes = Math.max(0, Math.round((dispatchTime - detectTime) / 60000));
        }

        // SLA Job Cancellation upon valid confirmed resource assignment
        await cancelSLAJob(String(incident._id));

        summary = `Assigned ${resource.name} (${resource.identifier}) to ${incident.incidentNumber}.`;

        if (io) {
          io.emit('resource.assigned', {
            incidentId: incident._id.toString(),
            resourceId: resource._id.toString(),
            callSign: resource.identifier,
            status: resource.status,
            timestamp: new Date(),
          });
          io.emit('resource.updated', {
            resourceId: resource._id.toString(),
            callSign: resource.identifier,
            status: resource.status,
            timestamp: new Date(),
          });
        }
        break;

      case 'CHANGE_SEVERITY':
        if (!newSeverity) throw new AppError('newSeverity is required', 400, 'BAD_REQUEST');
        const oldSev = incident.severity;
        incident.severity = newSeverity;
        summary = `Severity modified from ${oldSev} to ${newSeverity}. Reason: ${reason || 'Operator assessment'}`;

        // SLA Job Reschedule check: If severity changed from P1 to non-P1, cancel SLA job. If P1 and unassigned, schedule.
        if (newSeverity !== 'CRITICAL' && incident.priority !== 'P1') {
          await cancelSLAJob(String(incident._id));
        } else if ((newSeverity === 'CRITICAL' || incident.priority === 'P1') && incident.assignedResources.length === 0) {
          await scheduleSLAJob(incident);
        }

        if (io) {
          io.emit('incident.severity.updated', {
            incidentId: incident._id.toString(),
            incidentNumber: incident.incidentNumber,
            previousSeverity: oldSev,
            newSeverity: newSeverity,
            reason: reason || 'Operator assessment',
            timestamp: new Date(),
          });
        }
        break;

      case 'ESCALATE':
        incident.status = 'ESCALATED';
        incident.escalationReason = reason || 'Response delay threshold exceeded';
        summary = `Incident escalated to supervisor queue. Reason: ${reason || 'Urgent coordination required'}`;

        if (io) {
          io.emit('incident.status.updated', {
            incidentId: incident._id.toString(),
            incidentNumber: incident.incidentNumber,
            status: 'ESCALATED',
            escalationReason: incident.escalationReason,
            timestamp: new Date(),
          });
        }
        break;

      case 'RESOLVE':
        incident.status = 'RESOLVED';
        incident.responseMetrics.resolvedTimestamp = new Date();
        const detectTime = new Date(incident.responseMetrics.detectionTimestamp).getTime();
        const resolveTime = incident.responseMetrics.resolvedTimestamp.getTime();
        incident.responseMetrics.totalResponseMinutes = Math.max(0, Math.round((resolveTime - detectTime) / 60000));

        // SLA Job Cancellation upon resolution
        await cancelSLAJob(String(incident._id));

        summary = `Incident marked RESOLVED by ${actorName}.`;
        // Release assigned resources to AVAILABLE
        await Resource.updateMany(
          { _id: { $in: incident.assignedResources } },
          { $set: { status: 'AVAILABLE', currentIncidentId: null } }
        );

        if (io) {
          io.emit('incident.status.updated', {
            incidentId: incident._id.toString(),
            incidentNumber: incident.incidentNumber,
            status: 'RESOLVED',
            timestamp: new Date(),
          });
        }
        break;

      case 'FIELD_NOTE':
        summary = `Field note recorded: "${note || reason}"`;
        break;

      default:
        if (newStatus) {
          incident.status = newStatus;
          summary = `Status transitioned to ${newStatus}.`;
          if (newStatus === 'ON_SCENE' && !incident.responseMetrics.arrivedTimestamp) {
            incident.responseMetrics.arrivedTimestamp = new Date();
          }
          if (['RESOLVED', 'MERGED', 'CANCELLED'].includes(newStatus)) {
            await cancelSLAJob(String(incident._id));
          }
          if (io) {
            io.emit('incident.status.updated', {
              incidentId: incident._id.toString(),
              incidentNumber: incident.incidentNumber,
              status: newStatus,
              timestamp: new Date(),
            });
          }
        } else {
          throw new AppError(`Unknown action: ${action}`, 400, 'INVALID_ACTION');
        }
    }

    await incident.save();

    // Create Audit Log Entry
    const auditEntry = await IncidentUpdate.create({
      incidentId: incident._id,
      actorId,
      actorName,
      actorRole,
      action: action as OperatorAction,
      summary,
      previousState,
      newState: {
        status: incident.status,
        severity: incident.severity,
        assignedResourcesCount: incident.assignedResources.length,
      },
      reason,
      timestamp: new Date(),
    });

    // Populate for response and Socket.IO emission
    await incident.populate('assignedResources');

    if (io) {
      io.emit('incident.updated', {
        incidentId: incident._id.toString(),
        changes: {
          status: incident.status,
          severity: incident.severity,
          assignedResources: incident.assignedResources.map((r: any) => r._id?.toString()),
        },
        audit: {
          id: auditEntry._id.toString(),
          incidentId: incident._id.toString(),
          actorId: actorId?.toString() || '',
          actorName,
          actorRole,
          action: auditEntry.action,
          summary: auditEntry.summary,
          previousState: auditEntry.previousState,
          newState: auditEntry.newState,
          reason: auditEntry.reason,
          timestamp: auditEntry.timestamp.toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        incident,
        auditEntry,
      },
    });
  } catch (err) {
    next(err);
  }
};
