import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env.js';
import { Incident, IIncident } from '../models/Incident.js';
import { Notification } from '../models/Notification.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';
import { io } from '../server.js';

const QUEUE_NAME = 'ps9_sla_critical_delay_queue';

let slaQueue: Queue | null = null;
let slaWorker: Worker | null = null;
let isRedisAvailable = false;

// In-memory single-process fallback timer map for environments without Redis
const inMemorySLATimers = new Map<string, NodeJS.Timeout>();

export function initSLAWorker() {
  try {
    const redisOptions = {
      host: env.REDIS_URL.includes('://')
        ? env.REDIS_URL.split('://')[1].split(':')[0]
        : 'localhost',
      port: parseInt(env.REDIS_URL.split(':').pop() || '6379', 10),
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
    };

    slaQueue = new Queue(QUEUE_NAME, { connection: redisOptions });
    slaWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        await processSLABreach(job.data.incidentId);
      },
      { connection: redisOptions }
    );

    slaWorker.on('failed', (job, err) => {
      console.warn(`[SLA Worker] Job ${job?.id} failed:`, err.message);
    });

    isRedisAvailable = true;
    console.log('[SLA Worker] BullMQ SLA Worker initialized with Redis connection.');
  } catch (err: any) {
    isRedisAvailable = false;
    console.warn(`[SLA Worker] Redis offline (${err.message}). Operating in single-process in-memory fallback mode.`);
  }
}

/**
 * Executes SLA Breach Escalation logic when SLA timer expires.
 */
export async function processSLABreach(incidentId: string): Promise<boolean> {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident) return false;

    // Check if incident is still unassigned and active
    const isUnassigned = !incident.assignedResources || incident.assignedResources.length === 0;
    const isEligibleStatus = ['ACTIVE', 'UNDER_REVIEW'].includes(incident.status);

    if (isUnassigned && isEligibleStatus) {
      incident.status = 'DELAYED';
      incident.escalationReason = `Critical response SLA breach: Exceeded ${env.CRITICAL_DISPATCH_TIMEOUT_MINUTES}-minute threshold without assigned resources.`;
      await incident.save();

      // Create Notification document
      const notification = await Notification.create({
        title: `CRITICAL RESPONSE DELAY BREACH: ${incident.incidentNumber}`,
        message: `Incident ${incident.incidentNumber} (${incident.title}) in ${incident.location.zone} exceeded the ${env.CRITICAL_DISPATCH_TIMEOUT_MINUTES}-minute dispatch SLA without assigned units.`,
        level: 'CRITICAL',
        type: 'DELAY_BREACH',
        relatedIncidentId: incident._id,
        zone: incident.location.zone,
        acknowledged: false,
      });

      // Log Audit Entry
      await IncidentUpdate.create({
        incidentId: incident._id,
        actorId: incident._id,
        actorName: 'SENTINEL SLA Worker',
        actorRole: 'SYSTEM',
        action: 'ESCALATE',
        summary: `SLA Breach: Automatic status updated to DELAYED due to ${env.CRITICAL_DISPATCH_TIMEOUT_MINUTES}-minute dispatch timeout.`,
        reason: incident.escalationReason,
        timestamp: new Date(),
      });

      // Broadcast Socket.IO Events
      if (io) {
        io.emit('incident.status.updated', {
          incidentId: String(incident._id),
          incidentNumber: incident.incidentNumber,
          status: 'DELAYED',
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
          type: 'CRITICAL_DELAY',
          relatedIncidentId: String(incident._id),
          incidentNumber: incident.incidentNumber,
          zone: incident.location.zone,
          createdAt: new Date().toISOString(),
        });
      }

      console.log(`[SLA Worker] Escalated incident ${incident.incidentNumber} to DELAYED state.`);
      return true;
    }
    return false;
  } catch (err: any) {
    console.error(`[SLA Worker Error processing incident ${incidentId}]:`, err?.message);
    return false;
  }
}

/**
 * Schedules a delayed SLA monitoring job with unique deterministic job ID: `sla_critical_delay_${incidentId}`
 */
export async function scheduleSLAJob(incident: IIncident): Promise<void> {
  const incidentIdStr = String(incident._id);
  const jobId = `sla_critical_delay_${incidentIdStr}`;

  // Check eligibility: P1 or CRITICAL, unassigned, active
  const isCriticalOrP1 = incident.priority === 'P1' || incident.severity === 'CRITICAL';
  const isUnassigned = !incident.assignedResources || incident.assignedResources.length === 0;
  const isActive = ['ACTIVE', 'UNDER_REVIEW'].includes(incident.status);

  if (!isCriticalOrP1 || !isUnassigned || !isActive) {
    // If not eligible, ensure any existing SLA job is removed
    await cancelSLAJob(incidentIdStr);
    return;
  }

  const delayMs = env.CRITICAL_DISPATCH_TIMEOUT_MINUTES * 60 * 1000;

  if (isRedisAvailable && slaQueue) {
    try {
      // Remove any existing job with same ID first to avoid duplicate queues
      const existingJob = await slaQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
      }
      await slaQueue.add('checkSLABreach', { incidentId: incidentIdStr }, { jobId, delay: delayMs });
      console.log(`[SLA Worker] Scheduled BullMQ SLA job ${jobId} for ${delayMs / 1000}s.`);
      return;
    } catch (err) {
      console.warn('[SLA Worker] Redis queue add failed, falling back to in-memory scheduler.');
    }
  }

  // In-memory fallback scheduler
  cancelInMemoryTimer(incidentIdStr);
  const timer = setTimeout(async () => {
    await processSLABreach(incidentIdStr);
    inMemorySLATimers.delete(incidentIdStr);
  }, delayMs);

  inMemorySLATimers.set(incidentIdStr, timer);
  console.log(`[SLA Worker] Scheduled in-memory fallback SLA timer for ${incidentIdStr} (${delayMs / 1000}s).`);
}

/**
 * Safely cancels an active SLA job for an incident when assignment or resolution occurs.
 */
export async function cancelSLAJob(incidentId: string): Promise<void> {
  const jobId = `sla_critical_delay_${incidentId}`;

  if (isRedisAvailable && slaQueue) {
    try {
      const job = await slaQueue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`[SLA Worker] Cancelled BullMQ SLA job ${jobId}.`);
      }
    } catch (err) {
      // Ignore removal error
    }
  }

  cancelInMemoryTimer(incidentId);
}

function cancelInMemoryTimer(incidentId: string) {
  if (inMemorySLATimers.has(incidentId)) {
    clearTimeout(inMemorySLATimers.get(incidentId)!);
    inMemorySLATimers.delete(incidentId);
    console.log(`[SLA Worker] Cancelled in-memory SLA timer for ${incidentId}.`);
  }
}

/**
 * Reschedules SLA job safely upon incident state changes.
 */
export async function rescheduleSLAJob(incident: IIncident): Promise<void> {
  const incidentIdStr = String(incident._id);
  await cancelSLAJob(incidentIdStr);
  await scheduleSLAJob(incident);
}
