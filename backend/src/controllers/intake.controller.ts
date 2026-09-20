import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Incident, IIncident } from '../models/Incident.js';
import { Report, IReport } from '../models/Report.js';
import { Sensor } from '../models/Sensor.js';
import { Resource } from '../models/Resource.js';
import { Notification } from '../models/Notification.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';
import { calculateSeverity } from '../services/severityEngine.js';
import { scheduleSLAJob } from '../services/slaWorker.js';
import {
  correlateWithIncidents,
  calculateHaversineDistanceMeters,
  calculateJaccardSimilarity,
} from '../services/correlationEngine.js';
import { idempotencyService } from '../services/idempotencyService.js';
import { io } from '../server.js';
import { AuthRequest } from '../middleware/auth.js';

export const submitCitizenReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rawText, category, callerInfo, location, mediaUrls } = req.body;

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Report description (rawText) is required.' },
      });
      return;
    }

    const reportCount = await Report.countDocuments();
    const reportNumber = `REP-2026-${String(reportCount + 1001).padStart(4, '0')}`;

    // 1. Initially create as an unverified Report record in triage queue
    const report = new Report({
      reportNumber,
      source: 'CITIZEN',
      rawText: rawText.trim(),
      category: category || 'OTHER',
      status: 'PENDING_TRIAGE',
      callerInfo: {
        name: callerInfo?.name || 'Anonymous Citizen',
        phone: callerInfo?.phone,
        locationDescription: callerInfo?.locationDescription,
      },
      location: {
        address: location?.address || 'Metropolitan Area',
        zone: location?.zone || 'Sector 1',
        coordinates: location?.coordinates || [-122.4194, 37.7749],
      },
      mediaUrls: mediaUrls || [],
      verified: false,
    });

    // 2. Fetch active incidents to check correlation
    const activeIncidents = await Incident.find({
      status: { $in: ['ACTIVE', 'UNDER_REVIEW', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'ESCALATED', 'DELAYED'] },
    }).sort({ createdAt: -1 });

    const correlationResult = correlateWithIncidents(
      {
        rawText: report.rawText,
        category: report.category,
        location: {
          address: report.location?.address,
          coordinates: report.location?.coordinates as [number, number],
        },
        timestamp: report.createdAt,
      },
      activeIncidents
    );

    // 3. Apply Correlation Rules
    // Rule: High confidence (>= 80%) auto-links incoming report to master incident
    if (correlationResult.matchType === 'AUTOMATIC_LINK' && correlationResult.matchedIncident) {
      const masterIncident = await Incident.findById(correlationResult.matchedIncident.id);
      if (masterIncident) {
        report.status = 'LINKED';
        report.incidentRef = masterIncident._id as mongoose.Types.ObjectId;
        report.confidenceScore = correlationResult.confidenceScore;

        if (!masterIncident.linkedReportIds) {
          masterIncident.linkedReportIds = [];
        }
        masterIncident.linkedReportIds.push(report._id as mongoose.Types.ObjectId);
        await masterIncident.save();

        // Audit log on master incident
        await IncidentUpdate.create({
          incidentId: masterIncident._id,
          actorName: 'Correlation Engine',
          actorRole: 'SYSTEM',
          action: 'LINK_REPORT',
          summary: `Citizen report ${report.reportNumber} automatically linked (Confidence: ${correlationResult.confidenceScore}%, Jaccard & Spatial Match).`,
          metadata: {
            reportNumber: report.reportNumber,
            confidenceScore: correlationResult.confidenceScore,
            scoreBreakdown: correlationResult.scoreBreakdown,
          },
        });

        // Broadcast real-time Socket.IO events for zero-refresh dashboard updates
        io.emit('incident.correlated', {
          masterIncidentId: String(masterIncident._id),
          reportId: String(report._id),
          newReportCount: masterIncident.linkedReportIds.length,
          message: `Citizen report ${report.reportNumber} automatically linked to ${masterIncident.incidentNumber}`,
        });
      }
    } else if (correlationResult.matchType === 'OPERATOR_REVIEW') {
      report.confidenceScore = correlationResult.confidenceScore;
    }

    await report.save();

    // Broadcast report.created event
    io.emit('report.created', {
      id: String(report._id),
      reportNumber: report.reportNumber,
      source: report.source,
      rawText: report.rawText,
      category: report.category,
      status: report.status,
      confidenceScore: report.confidenceScore,
      incidentRef: report.incidentRef ? String(report.incidentRef) : undefined,
      location: report.location,
      callerInfo: report.callerInfo,
      createdAt: report.createdAt.toISOString(),
    });

    res.status(201).json({
      success: true,
      report: {
        id: report._id,
        reportNumber: report.reportNumber,
        status: report.status,
        incidentRef: report.incidentRef,
        confidenceScore: report.confidenceScore,
        createdAt: report.createdAt,
      },
      correlation: correlationResult,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTAKE_ERROR', message: error.message },
    });
  }
};

export const createOperatorIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      type,
      location,
      casualtiesCount = 0,
      hazards = {},
      infrastructureRisk = false,
      initialReportId,
      force = false,
    } = req.body;

    if (!title || !description || !type || !location || !location.address || !location.coordinates) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required incident fields.' },
      });
      return;
    }

    // 1. Calculate deterministic severity
    const severityResult = calculateSeverity({
      type,
      casualtiesCount: Number(casualtiesCount) || 0,
      hazards,
      infrastructureRisk: Boolean(infrastructureRisk),
    });

    // 2. Correlation pre-check against active incidents
    const activeIncidents = await Incident.find({
      status: { $in: ['ACTIVE', 'UNDER_REVIEW', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'ESCALATED', 'DELAYED'] },
    }).sort({ createdAt: -1 });

    const correlationCheck = correlateWithIncidents(
      {
        rawText: `${title} ${description}`,
        type,
        location: {
          address: location.address,
          coordinates: location.coordinates,
        },
      },
      activeIncidents
    );

    // If duplicate detected and not forced, return warning for operator review
    if (correlationCheck.isDuplicate && !force) {
      res.status(409).json({
        success: false,
        warning: 'POSSIBLE_DUPLICATE',
        message: `High correlation (${correlationCheck.confidenceScore}%) with existing incident ${correlationCheck.matchedIncident?.incidentNumber}.`,
        correlation: correlationCheck,
        suggestion: 'Confirm if this should be linked as a supporting report or confirmed as a new incident with force=true.',
      });
      return;
    }

    // 3. Create master incident
    const incidentCount = await Incident.countDocuments();
    const incidentNumber = `INC-2026-${String(incidentCount + 1001).padStart(4, '0')}`;

    const incident = new Incident({
      incidentNumber,
      title: title.trim(),
      description: description.trim(),
      type,
      severity: severityResult.severity,
      priority: severityResult.priority,
      status: 'ACTIVE',
      location: {
        address: location.address,
        zone: location.zone || 'Sector 1',
        coordinates: location.coordinates,
      },
      casualtiesCount: Number(casualtiesCount) || 0,
      hazardLevel: severityResult.severity === 'CRITICAL' ? 'SEVERE' : 'STANDARD',
      tags: [type, severityResult.priority, ...(hazards.toxicChemicalOrHazardous ? ['HAZMAT'] : [])],
      primaryReporterId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      linkedReportIds: initialReportId ? [new mongoose.Types.ObjectId(initialReportId)] : [],
      telemetryReadings: [],
      responseMetrics: {
        detectionTimestamp: new Date(),
      },
    });

    await incident.save();

    // Schedule SLA monitoring job for P1 / CRITICAL incidents
    await scheduleSLAJob(incident);

    // If initialReportId was provided, update that report to LINKED
    if (initialReportId && mongoose.isValidObjectId(initialReportId)) {
      await Report.findByIdAndUpdate(initialReportId, {
        status: 'LINKED',
        incidentRef: incident._id,
        verified: true,
      });
    }

    // 4. Create initial audit log
    await IncidentUpdate.create({
      incidentId: incident._id,
      actorId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      actorName: req.user?.name || 'Dispatcher',
      actorRole: req.user?.role || 'OPERATOR',
      action: 'ACKNOWLEDGE',
      summary: `Incident logged via EOC operator intake. Severity score: ${severityResult.score}/100 (${severityResult.severity}, ${severityResult.priority}).`,
      newState: {
        severity: incident.severity,
        priority: incident.priority,
        status: incident.status,
      },
      metadata: {
        breakdown: severityResult.breakdown,
        explanation: severityResult.explanation,
      },
    });

    // 5. Query Recommended Resources & Check Resource Shortage Trigger
    const recommendedResources = await Resource.find({
      status: 'AVAILABLE',
      zone: incident.location.zone,
    })
      .limit(4)
      .select('identifier name type status capabilities zone baseStation currentLocation');

    if (recommendedResources.length === 0 && (incident.priority === 'P1' || incident.severity === 'CRITICAL')) {
      const shortageNotif = await Notification.create({
        title: `RESOURCE SHORTAGE ALERT: ${incident.location.zone}`,
        message: `Critical Incident ${incident.incidentNumber} logged in ${incident.location.zone} but 0 available response units exist in this zone!`,
        level: 'CRITICAL',
        type: 'RESOURCE_SHORTAGE',
        relatedIncidentId: incident._id,
        zone: incident.location.zone,
        acknowledged: false,
      });

      if (io) {
        io.emit('notification.created', {
          notificationId: shortageNotif._id,
          title: shortageNotif.title,
          message: shortageNotif.message,
          level: shortageNotif.level,
          type: shortageNotif.type,
          relatedIncidentId: incident._id,
          zone: shortageNotif.zone,
          createdAt: shortageNotif.createdAt,
        });
      }
    }

    // 6. Real-time broadcast
    io.emit('incident.created', {
      id: String(incident._id),
      incidentNumber: incident.incidentNumber,
      title: incident.title,
      description: incident.description,
      type: incident.type,
      severity: incident.severity,
      priority: incident.priority,
      status: incident.status,
      location: incident.location,
      casualtiesCount: incident.casualtiesCount,
      hazardLevel: incident.hazardLevel,
      tags: incident.tags,
      assignedResources: [],
      linkedReportIds: incident.linkedReportIds.map(String),
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
    });

    if (incident.severity === 'CRITICAL') {
      io.emit('alert.created', {
        id: `ALERT-${Date.now()}`,
        title: `CRITICAL Incident Logged: ${incident.incidentNumber}`,
        message: `${incident.title} in ${incident.location.zone} requires immediate response package.`,
        level: 'CRITICAL',
        type: 'HAZARD_ALERT',
        relatedIncidentId: String(incident._id),
        zone: incident.location.zone,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      incident,
      severityResult,
      recommendedResources,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'OPERATOR_INTAKE_ERROR', message: error.message },
    });
  }
};

/**
 * Restricted Operator Correlation Endpoint:
 * 1. Linking an ambiguous report to an existing master incident.
 * 2. Merging two already-existing active incidents (ALWAYS requires operator confirmation).
 */
export const resolveReportCorrelation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, reportId, masterIncidentId, sourceIncidentId } = req.body;

    if (!action || !['LINK_REPORT', 'MERGE_INCIDENTS'].includes(action)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACTION', message: "Action must be 'LINK_REPORT' or 'MERGE_INCIDENTS'." },
      });
      return;
    }

    // Action A: Link Report to Master Incident
    if (action === 'LINK_REPORT') {
      if (!reportId || !masterIncidentId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Both reportId and masterIncidentId are required.' },
        });
        return;
      }

      const report = await Report.findById(reportId);
      const masterIncident = await Incident.findById(masterIncidentId);

      if (!report || !masterIncident) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report or Master Incident not found.' },
        });
        return;
      }

      report.status = 'LINKED';
      report.incidentRef = masterIncident._id as mongoose.Types.ObjectId;
      report.verified = true;
      await report.save();

      if (!masterIncident.linkedReportIds) {
        masterIncident.linkedReportIds = [];
      }
      if (!masterIncident.linkedReportIds.some((id) => String(id) === String(report._id))) {
        masterIncident.linkedReportIds.push(report._id as mongoose.Types.ObjectId);
        await masterIncident.save();
      }

      await IncidentUpdate.create({
        incidentId: masterIncident._id,
        actorId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        actorName: req.user?.name || 'Dispatcher',
        actorRole: req.user?.role || 'OPERATOR',
        action: 'LINK_REPORT',
        summary: `Operator confirmed link: Report ${report.reportNumber} associated with master incident ${masterIncident.incidentNumber}.`,
      });

      io.emit('incident.correlated', {
        masterIncidentId: String(masterIncident._id),
        reportId: String(report._id),
        newReportCount: masterIncident.linkedReportIds.length,
        message: `Report ${report.reportNumber} linked to ${masterIncident.incidentNumber}`,
      });

      res.json({
        success: true,
        message: `Report ${report.reportNumber} linked to ${masterIncident.incidentNumber}.`,
        masterIncident,
        report,
      });
      return;
    }

    // Action B: Merge Two Already-Existing Incidents
    // Always requires human operator confirmation per platform rules!
    if (action === 'MERGE_INCIDENTS') {
      if (!sourceIncidentId || !masterIncidentId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Both sourceIncidentId and masterIncidentId are required.' },
        });
        return;
      }

      if (sourceIncidentId === masterIncidentId) {
        res.status(400).json({
          success: false,
          error: { code: 'IDENTICAL_INCIDENTS', message: 'Cannot merge an incident into itself.' },
        });
        return;
      }

      const sourceIncident = await Incident.findById(sourceIncidentId);
      const masterIncident = await Incident.findById(masterIncidentId);

      if (!sourceIncident || !masterIncident) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Source incident or master incident not found.' },
        });
        return;
      }

      // Mark source incident as MERGED
      const prevSourceStatus = sourceIncident.status;
      sourceIncident.status = 'MERGED';
      sourceIncident.mergedIntoIncidentId = masterIncident._id as mongoose.Types.ObjectId;
      await sourceIncident.save();

      // Transfer any linked reports to master
      if (sourceIncident.linkedReportIds && sourceIncident.linkedReportIds.length > 0) {
        if (!masterIncident.linkedReportIds) {
          masterIncident.linkedReportIds = [];
        }
        for (const repId of sourceIncident.linkedReportIds) {
          if (!masterIncident.linkedReportIds.some((id) => String(id) === String(repId))) {
            masterIncident.linkedReportIds.push(repId);
          }
          await Report.findByIdAndUpdate(repId, { incidentRef: masterIncident._id });
        }
      }

      // Transfer telemetry readings
      if (sourceIncident.telemetryReadings && sourceIncident.telemetryReadings.length > 0) {
        if (!masterIncident.telemetryReadings) {
          masterIncident.telemetryReadings = [];
        }
        masterIncident.telemetryReadings.push(...sourceIncident.telemetryReadings);
      }

      await masterIncident.save();

      // Audit logs on both incidents
      await IncidentUpdate.create({
        incidentId: sourceIncident._id,
        actorId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        actorName: req.user?.name || 'Dispatcher',
        actorRole: req.user?.role || 'OPERATOR',
        action: 'MERGE_INCIDENT',
        summary: `Incident ${sourceIncident.incidentNumber} merged into master incident ${masterIncident.incidentNumber} by operator.`,
        previousState: { status: prevSourceStatus },
        newState: { status: 'MERGED', mergedIntoIncidentId: masterIncident._id },
      });

      await IncidentUpdate.create({
        incidentId: masterIncident._id,
        actorId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        actorName: req.user?.name || 'Dispatcher',
        actorRole: req.user?.role || 'OPERATOR',
        action: 'MERGE_INCIDENT',
        summary: `Incident ${sourceIncident.incidentNumber} merged into this master incident by operator.`,
      });

      // Real-time notifications
      io.emit('incident.status.updated', {
        incidentId: String(sourceIncident._id),
        previousStatus: prevSourceStatus,
        newStatus: 'MERGED',
      });

      io.emit('incident.correlated', {
        masterIncidentId: String(masterIncident._id),
        mergedIncidentId: String(sourceIncident._id),
        newReportCount: masterIncident.linkedReportIds?.length || 0,
        message: `Incident ${sourceIncident.incidentNumber} merged into master ${masterIncident.incidentNumber}`,
      });

      res.json({
        success: true,
        message: `Incident ${sourceIncident.incidentNumber} successfully merged into ${masterIncident.incidentNumber}.`,
        masterIncident,
        sourceIncident,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CORRELATION_ERROR', message: error.message },
    });
  }
};

export const submitFieldUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { incidentId, casualtiesCount, hazards = {}, fieldNotes, status } = req.body;

    if (!incidentId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'incidentId is required.' },
      });
      return;
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found.' },
      });
      return;
    }

    const previousSeverity = incident.severity;
    const previousStatus = incident.status;

    // Recalculate severity if casualties or hazards provided
    const newCasualties = casualtiesCount !== undefined ? Number(casualtiesCount) : incident.casualtiesCount;
    const severityResult = calculateSeverity({
      type: incident.type,
      casualtiesCount: newCasualties,
      hazards,
      infrastructureRisk: incident.tags.includes('EXPRESSWAY') || incident.tags.includes('TRANSIT'),
    });

    incident.casualtiesCount = newCasualties;
    incident.severity = severityResult.severity;
    incident.priority = severityResult.priority;
    if (status && status !== incident.status) {
      incident.status = status;
    }

    await incident.save();

    // Audit log
    await IncidentUpdate.create({
      incidentId: incident._id,
      actorId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      actorName: req.user?.name || 'On-Scene Unit',
      actorRole: req.user?.role || 'FIELD_TEAM',
      action: 'FIELD_NOTE',
      summary: fieldNotes || `Field update submitted: ${newCasualties} casualties, severity reassessed to ${incident.severity}.`,
      previousState: { severity: previousSeverity, status: previousStatus },
      newState: { severity: incident.severity, status: incident.status },
      metadata: {
        score: severityResult.score,
        breakdown: severityResult.breakdown,
        explanation: severityResult.explanation,
      },
    });

    // Real-time broadcasts
    if (previousSeverity !== incident.severity) {
      io.emit('incident.severity.updated', {
        incidentId: String(incident._id),
        previousSeverity,
        newSeverity: incident.severity,
        newPriority: incident.priority,
        score: severityResult.score,
        explanation: severityResult.explanation,
      });
    }

    if (previousStatus !== incident.status) {
      io.emit('incident.status.updated', {
        incidentId: String(incident._id),
        previousStatus,
        newStatus: incident.status,
      });
    }

    res.json({
      success: true,
      incident,
      severityResult,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FIELD_UPDATE_ERROR', message: error.message },
    });
  }
};

/**
 * Sensor Telemetry Ingestion with Repeat-Reading Telemetry Updates:
 * "Repeated sensor readings should update telemetry without creating duplicate incidents or alerts."
 */
export const ingestSensorTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sensorCode, reading, unit, zone, timestamp } = req.body;

    if (!sensorCode || reading === undefined) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sensorCode and reading are required.' },
      });
      return;
    }

    // 1. Idempotency Check (60-second duplicate suppression)
    const idempotencyKey = idempotencyService.generateHash({
      sensorCode,
      reading: Math.round(Number(reading) * 10) / 10,
      minuteWindow: Math.floor(Date.now() / 60000),
    });

    if (idempotencyService.isDuplicate(idempotencyKey)) {
      res.status(200).json({
        success: true,
        duplicateSuppressed: true,
        message: 'Duplicate sensor reading within 60-second window suppressed.',
      });
      return;
    }

    // 2. Fetch or initialize sensor
    let sensor = await Sensor.findOne({ sensorCode });
    if (!sensor) {
      sensor = new Sensor({
        sensorCode,
        type: sensorCode.includes('TEMP') ? 'TEMPERATURE' : 'SMOKE',
        zone: zone || 'Sector 5',
        location: zone === 'Sector 3' ? [-122.4089, 37.7649] : [-122.3952, 37.7885],
        currentReading: Number(reading),
        unit: unit || 'ppm',
        warningThreshold: 60,
        criticalThreshold: 100,
        status: 'NORMAL',
      });
    }

    sensor.currentReading = Number(reading);
    sensor.lastPing = new Date();

    if (sensor.currentReading >= sensor.criticalThreshold) {
      sensor.status = 'CRITICAL';
    } else if (sensor.currentReading >= sensor.warningThreshold) {
      sensor.status = 'WARNING';
    } else {
      sensor.status = 'NORMAL';
    }

    await sensor.save();

    // Trigger Sensor Spike Notification if reading >= 1.5x critical threshold
    if (sensor.currentReading >= sensor.criticalThreshold * 1.5) {
      const spikeNotif = await Notification.create({
        title: `CRITICAL SENSOR SPIKE ALERT: ${sensor.sensorCode}`,
        message: `Sensor ${sensor.sensorCode} in ${sensor.zone} registered reading ${sensor.currentReading} ${sensor.unit}, exceeding 1.5x critical threshold!`,
        level: 'CRITICAL',
        type: 'SENSOR_ALERT',
        zone: sensor.zone,
        acknowledged: false,
      });

      if (io) {
        io.emit('notification.created', {
          notificationId: spikeNotif._id,
          title: spikeNotif.title,
          message: spikeNotif.message,
          level: spikeNotif.level,
          type: spikeNotif.type,
          zone: spikeNotif.zone,
          createdAt: spikeNotif.createdAt,
        });
      }
    }

    // 3. Sensor Repeat-Reading Check: Check if an active incident already exists in this zone or linked to sensor
    let activeIncident: IIncident | null = null;
    if (sensor.incidentRef) {
      activeIncident = await Incident.findById(sensor.incidentRef);
      if (activeIncident && ['RESOLVED', 'MERGED'].includes(activeIncident.status)) {
        activeIncident = null;
      }
    }

    if (!activeIncident) {
      activeIncident = await Incident.findOne({
        status: { $in: ['ACTIVE', 'UNDER_REVIEW', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'ESCALATED', 'DELAYED'] },
        'location.zone': sensor.zone,
      }).sort({ createdAt: -1 });
    }

    let isNewIncidentCreated = false;

    // Rule: If an active incident already exists, update telemetry without creating duplicate incidents or alerts!
    if (activeIncident) {
      if (!activeIncident.telemetryReadings) {
        activeIncident.telemetryReadings = [];
      }
      activeIncident.telemetryReadings.push({
        sensorCode: sensor.sensorCode,
        sensorType: sensor.type,
        reading: sensor.currentReading,
        unit: sensor.unit,
        timestamp: new Date(),
      });
      await activeIncident.save();

      sensor.incidentRef = activeIncident._id as mongoose.Types.ObjectId;
      await sensor.save();

      // Audit entry for telemetry update
      await IncidentUpdate.create({
        incidentId: activeIncident._id,
        actorName: `Sensor ${sensor.sensorCode}`,
        actorRole: 'SYSTEM',
        action: 'TELEMETRY_UPDATE',
        summary: `Telemetry update appended: ${sensor.sensorCode} reading ${sensor.currentReading} ${sensor.unit} (${sensor.status}). No duplicate incident created.`,
      });

      // Emit sensor reading event
      io.emit('sensor.reading', {
        sensorCode: sensor.sensorCode,
        reading: sensor.currentReading,
        unit: sensor.unit,
        status: sensor.status,
        zone: sensor.zone,
        incidentId: String(activeIncident._id),
      });
    } else if (sensor.status === 'CRITICAL') {
      // If NO active incident exists and reading is CRITICAL, spawn new incident
      isNewIncidentCreated = true;
      const count = await Incident.countDocuments();
      const newInc = new Incident({
        incidentNumber: `INC-2026-${String(count + 1001).padStart(4, '0')}`,
        title: `Automated Alarm: ${sensor.type} Breach at ${sensor.zone}`,
        description: `Automated breach detected by sensor ${sensor.sensorCode}: current reading ${sensor.currentReading} ${sensor.unit} exceeded critical threshold (${sensor.criticalThreshold} ${sensor.unit}).`,
        type: sensor.type === 'SMOKE' ? 'FIRE' : 'INDUSTRIAL_ACCIDENT',
        severity: 'CRITICAL',
        priority: 'P1',
        status: 'ACTIVE',
        location: {
          address: `${sensor.zone} Sensor Grid`,
          zone: sensor.zone,
          coordinates: sensor.location,
        },
        casualtiesCount: 0,
        hazardLevel: 'SEVERE',
        tags: ['SENSOR_TRIGGERED', sensor.type, 'CRITICAL'],
        telemetryReadings: [
          {
            sensorCode: sensor.sensorCode,
            sensorType: sensor.type,
            reading: sensor.currentReading,
            unit: sensor.unit,
            timestamp: new Date(),
          },
        ],
      });

      await newInc.save();
      await scheduleSLAJob(newInc);
      sensor.incidentRef = newInc._id as mongoose.Types.ObjectId;
      await sensor.save();

      // Audit log
      await IncidentUpdate.create({
        incidentId: newInc._id,
        actorName: `Sensor ${sensor.sensorCode}`,
        actorRole: 'SYSTEM',
        action: 'ACKNOWLEDGE',
        summary: `Automated incident created from critical sensor breach (${sensor.currentReading} ${sensor.unit}).`,
      });

      // Real-time broadcasts
      io.emit('incident.created', {
        id: String(newInc._id),
        incidentNumber: newInc.incidentNumber,
        title: newInc.title,
        description: newInc.description,
        type: newInc.type,
        severity: newInc.severity,
        priority: newInc.priority,
        status: newInc.status,
        location: newInc.location,
        casualtiesCount: newInc.casualtiesCount,
        hazardLevel: newInc.hazardLevel,
        tags: newInc.tags,
        assignedResources: [],
        createdAt: newInc.createdAt.toISOString(),
        updatedAt: newInc.updatedAt.toISOString(),
      });

      io.emit('alert.created', {
        id: `ALERT-${Date.now()}`,
        title: `CRITICAL SENSOR BREACH: ${sensor.sensorCode}`,
        message: `${sensor.type} reached ${sensor.currentReading} ${sensor.unit} in ${sensor.zone}`,
        level: 'CRITICAL',
        type: 'HAZARD_ALERT',
        relatedIncidentId: String(newInc._id),
        zone: sensor.zone,
        createdAt: new Date().toISOString(),
      });

      activeIncident = newInc;
    }

    res.json({
      success: true,
      sensor: {
        code: sensor.sensorCode,
        reading: sensor.currentReading,
        status: sensor.status,
        zone: sensor.zone,
      },
      activeIncidentId: activeIncident ? activeIncident._id : undefined,
      isNewIncidentCreated,
      telemetryAppended: Boolean(activeIncident && !isNewIncidentCreated),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SENSOR_INGESTION_ERROR', message: error.message },
    });
  }
};

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 20 } = req.query;
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .populate('incidentRef', 'incidentNumber title severity status')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
    });
  }
};

export const getCorrelationSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const pendingReports = await Report.find({ status: 'PENDING_TRIAGE' })
      .sort({ createdAt: -1 })
      .limit(10);

    const activeIncidents = await Incident.find({
      status: { $in: ['ACTIVE', 'UNDER_REVIEW', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'ESCALATED', 'DELAYED'] },
    }).sort({ createdAt: -1 });

    const suggestions = [];

    for (const rep of pendingReports) {
      const match = correlateWithIncidents(
        {
          rawText: rep.rawText,
          category: rep.category,
          location: {
            address: rep.location?.address,
            coordinates: rep.location?.coordinates as [number, number],
          },
          timestamp: rep.createdAt,
        },
        activeIncidents
      );

      if (match.isDuplicate && match.matchedIncident) {
        suggestions.push({
          reportId: rep._id,
          reportNumber: rep.reportNumber,
          reportText: rep.rawText,
          reportLocation: rep.location,
          matchedIncident: match.matchedIncident,
          confidenceScore: match.confidenceScore,
          matchType: match.matchType,
          scoreBreakdown: match.scoreBreakdown,
          explanation: match.explanation,
        });
      }
    }

    res.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CORRELATION_FETCH_ERROR', message: error.message },
    });
  }
};

/**
 * 1-Click Interactive Hackathon Demo Scenarios
 */
export const triggerDemoScenario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scenarioName } = req.params;

    if (scenarioName === 'industrial-explosion') {
      // 1. First citizen report
      const rep1 = await Report.create({
        reportNumber: `REP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        source: 'CITIZEN',
        rawText: 'Loud explosion heard at chemical storage warehouse on 740 Industrial Way, heavy black smoke rising!',
        category: 'FIRE',
        status: 'PENDING_TRIAGE',
        location: {
          address: '740 Industrial Way, Sector 3',
          zone: 'Sector 3',
          coordinates: [-122.4089, 37.7649],
        },
      });

      // 2. Create Master Incident
      const sev = calculateSeverity({
        type: 'INDUSTRIAL_ACCIDENT',
        casualtiesCount: 2,
        hazards: { explosionConfirmed: true, toxicChemicalOrHazardous: true },
        infrastructureRisk: true,
      });

      const inc = await Incident.create({
        incidentNumber: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: 'Chemical Storage Facility Explosion',
        description: 'Explosion at warehouse facility, black plume moving eastward. Toxic risk confirmed.',
        type: 'INDUSTRIAL_ACCIDENT',
        severity: sev.severity,
        priority: sev.priority,
        status: 'ACTIVE',
        location: {
          address: '740 Industrial Way, Sector 3',
          zone: 'Sector 3',
          coordinates: [-122.4089, 37.7649],
        },
        casualtiesCount: 2,
        hazardLevel: 'SEVERE',
        tags: ['INDUSTRIAL_ACCIDENT', 'EXPLOSION', 'HAZMAT', 'P1'],
        linkedReportIds: [rep1._id],
        telemetryReadings: [
          {
            sensorCode: 'SENS-IND-301',
            sensorType: 'SMOKE',
            reading: 185,
            unit: 'ppm',
            timestamp: new Date(),
          },
        ],
      });

      rep1.status = 'LINKED';
      rep1.incidentRef = inc._id as mongoose.Types.ObjectId;
      await rep1.save();

      // 3. Second citizen report (will automatically correlate and link)
      const rep2 = await Report.create({
        reportNumber: `REP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        source: 'CITIZEN',
        rawText: 'Severe toxic chemical smell and smoke near 750 Industrial Way warehouse blast!',
        category: 'FIRE',
        status: 'LINKED',
        incidentRef: inc._id as mongoose.Types.ObjectId,
        location: {
          address: '750 Industrial Way, Sector 3',
          zone: 'Sector 3',
          coordinates: [-122.4079, 37.7645], // within 100 meters
        },
      });

      inc.linkedReportIds.push(rep2._id as mongoose.Types.ObjectId);
      await inc.save();

      // Emit events
      io.emit('report.created', {
        id: String(rep1._id),
        reportNumber: rep1.reportNumber,
        source: rep1.source,
        rawText: rep1.rawText,
        category: rep1.category,
        status: rep1.status,
        location: rep1.location,
        createdAt: rep1.createdAt.toISOString(),
      });

      io.emit('incident.created', {
        id: String(inc._id),
        incidentNumber: inc.incidentNumber,
        title: inc.title,
        description: inc.description,
        type: inc.type,
        severity: inc.severity,
        priority: inc.priority,
        status: inc.status,
        location: inc.location,
        casualtiesCount: inc.casualtiesCount,
        hazardLevel: inc.hazardLevel,
        tags: inc.tags,
        assignedResources: [],
        linkedReportIds: inc.linkedReportIds.map(String),
        createdAt: inc.createdAt.toISOString(),
        updatedAt: inc.updatedAt.toISOString(),
      });

      io.emit('incident.correlated', {
        masterIncidentId: String(inc._id),
        reportId: String(rep2._id),
        newReportCount: inc.linkedReportIds.length,
        message: `Report ${rep2.reportNumber} automatically linked to master incident ${inc.incidentNumber} via Jaccard & spatial correlation.`,
      });

      io.emit('alert.created', {
        id: `ALERT-${Date.now()}`,
        title: `SCENARIO: Industrial Explosion (${inc.incidentNumber})`,
        message: 'Severe chemical explosion triggered in Sector 3. Reports correlated in real time.',
        level: 'CRITICAL',
        type: 'HAZARD_ALERT',
        relatedIncidentId: String(inc._id),
        zone: inc.location.zone,
        createdAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        scenario: 'industrial-explosion',
        incident: inc,
        reports: [rep1, rep2],
      });
      return;
    }

    if (scenarioName === 'sensor-spike') {
      // Simulate repeated sensor spike
      const sensor = await Sensor.findOneAndUpdate(
        { zone: 'Sector 3' },
        { currentReading: 195, status: 'CRITICAL', lastPing: new Date() },
        { new: true }
      );

      io.emit('sensor.reading', {
        sensorCode: sensor?.sensorCode || 'SENS-IND-301',
        reading: 195,
        unit: sensor?.unit || 'ppm',
        status: 'CRITICAL',
        zone: 'Sector 3',
      });

      io.emit('alert.created', {
        id: `ALERT-${Date.now()}`,
        title: `SENSOR ALERT: ${sensor?.sensorCode || 'SENS-IND-301'} Critical Breach`,
        message: `Reading 195 ppm exceeded threshold in Sector 3.`,
        level: 'CRITICAL',
        type: 'HAZARD_ALERT',
        zone: 'Sector 3',
        createdAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        scenario: 'sensor-spike',
        sensor,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: { code: 'UNKNOWN_SCENARIO', message: `Scenario '${scenarioName}' is not recognized.` },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SCENARIO_ERROR', message: error.message },
    });
  }
};
