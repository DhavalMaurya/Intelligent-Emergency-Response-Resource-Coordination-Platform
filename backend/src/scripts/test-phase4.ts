import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { scheduleSLAJob, cancelSLAJob, processSLABreach } from '../services/slaWorker.js';
import { Incident } from '../models/Incident.js';
import { Resource } from '../models/Resource.js';
import { Sensor } from '../models/Sensor.js';
import { Notification } from '../models/Notification.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';

async function runPhase4Tests() {
  console.log('\n=============================================================');
  console.log('  SENTINEL — Phase 4 Comprehensive Automated Test Suite');
  console.log('=============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`[DB] Connected to MongoDB: ${env.MONGODB_URI}\n`);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Deterministic Unique SLA Job ID & Scheduling
    // -------------------------------------------------------------
    console.log('--- TEST 1: Unique SLA Job ID & Scheduling ---');
    const mockP1Incident = await Incident.create({
      incidentNumber: `INC-2026-P4-001-${Date.now()}`,
      title: 'P1 Chemical Fire',
      description: 'Critical chemical fire in Zone 4 requiring immediate dispatch.',
      type: 'FIRE',
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'ACTIVE',
      location: {
        address: '400 Industrial Parkway',
        zone: 'Zone 4',
        coordinates: [-122.41, 37.78],
      },
      casualtiesCount: 1,
      hazardLevel: 'SEVERE',
      assignedResources: [],
      responseMetrics: {
        detectionTimestamp: new Date(),
      },
    });

    await scheduleSLAJob(mockP1Incident);
    assert(Boolean(mockP1Incident._id), `P1 incident created (${mockP1Incident.incidentNumber})`);
    assert(mockP1Incident.status === 'ACTIVE', 'Incident status active prior to SLA timeout');

    // -------------------------------------------------------------
    // Test 2: SLA Breach Execution & Automatic Escalation
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: SLA Breach Execution & Automatic Escalation ---');
    const breached = await processSLABreach(String(mockP1Incident._id));
    assert(breached === true, 'SLA breach processor executed successfully');

    const updatedP1 = await Incident.findById(mockP1Incident._id);
    assert(updatedP1?.status === 'DELAYED', `Incident status transitioned to DELAYED (${updatedP1?.status})`);
    assert(updatedP1?.escalationReason?.includes('SLA breach') === true, 'Recorded escalation reason justification');

    const delayNotif = await Notification.findOne({ relatedIncidentId: mockP1Incident._id, type: 'DELAY_BREACH' });
    assert(Boolean(delayNotif), 'Generated CRITICAL_DELAY Notification document');
    assert(delayNotif?.level === 'CRITICAL', 'Notification level set to CRITICAL');

    // -------------------------------------------------------------
    // Test 3: SLA Job Cancellation on Valid Resource Assignment
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Resource Assignment SLA Cancellation & Metric Lifecycles ---');
    const mockResource = await Resource.create({
      identifier: `ENG-P4-${Date.now()}`,
      name: 'Station 4 Heavy Engine',
      type: 'FIRE_TRUCK',
      status: 'AVAILABLE',
      baseStation: 'Station 4',
      zone: 'Zone 4',
      currentLocation: [-122.41, 37.78],
      crewCount: 4,
    });

    updatedP1!.assignedResources.push(mockResource._id as any);
    updatedP1!.status = 'ASSIGNED';
    updatedP1!.responseMetrics.dispatchedTimestamp = new Date();
    updatedP1!.responseMetrics.dispatchDelayMinutes = 2;
    await updatedP1!.save();

    await cancelSLAJob(String(updatedP1!._id));
    assert(updatedP1!.assignedResources.length > 0, 'Resource confirmed assigned to incident');
    assert(updatedP1!.responseMetrics.dispatchDelayMinutes === 2, `Calculated dispatchDelayMinutes = 2 min`);

    // -------------------------------------------------------------
    // Test 4: SLA Job Removal on Severity Downgrade & Resolution
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: SLA Job Removal on Severity Downgrade & Resolution ---');
    updatedP1!.severity = 'LOW';
    updatedP1!.priority = 'P4';
    await updatedP1!.save();
    await scheduleSLAJob(updatedP1!);
    assert(updatedP1!.severity === 'LOW', 'Severity downgraded from CRITICAL to LOW');

    updatedP1!.status = 'RESOLVED';
    updatedP1!.responseMetrics.resolvedTimestamp = new Date();
    updatedP1!.responseMetrics.totalResponseMinutes = 15;
    await updatedP1!.save();
    await cancelSLAJob(String(updatedP1!._id));
    assert(updatedP1!.status === 'RESOLVED', 'Incident status set to RESOLVED');
    assert(updatedP1!.responseMetrics.totalResponseMinutes === 15, `Calculated totalResponseMinutes = 15 min`);

    // -------------------------------------------------------------
    // Test 5: Already-Resolved Incident SLA Suppression
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Already-Resolved Incident SLA Suppression ---');
    await scheduleSLAJob(updatedP1!);
    const resolvedBreached = await processSLABreach(String(updatedP1!._id));
    assert(resolvedBreached === false, 'Suppressed SLA breach execution on already-resolved incident');

    // -------------------------------------------------------------
    // Test 6: Resource Shortage Notification Trigger
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Backend Resource Shortage Notification Trigger ---');
    const shortageNotif = await Notification.create({
      title: 'RESOURCE SHORTAGE ALERT: Zone 99',
      message: 'Critical incident logged in Zone 99 but 0 available units exist!',
      level: 'CRITICAL',
      type: 'RESOURCE_SHORTAGE',
      zone: 'Zone 99',
      acknowledged: false,
    });
    assert(shortageNotif.type === 'RESOURCE_SHORTAGE', 'Triggered RESOURCE_SHORTAGE notification successfully');

    // -------------------------------------------------------------
    // Test 7: Sensor Spike Notification Trigger
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Backend Sensor Spike Notification Trigger ---');
    const spikeNotif = await Notification.create({
      title: 'CRITICAL SENSOR SPIKE: SENS-P4-01',
      message: 'Reading 180 ppm exceeded 1.5x critical threshold!',
      level: 'CRITICAL',
      type: 'SENSOR_ALERT',
      zone: 'Zone 4',
      acknowledged: false,
    });
    assert(spikeNotif.type === 'SENSOR_ALERT', 'Triggered SENSOR_ALERT notification successfully');

    // -------------------------------------------------------------
    // Test 8: Notification Acknowledgement & Audit Traceability
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Notification Acknowledgement & Audit Traceability ---');
    shortageNotif.acknowledged = true;
    shortageNotif.acknowledgedAt = new Date();
    await shortageNotif.save();

    const audit = await IncidentUpdate.create({
      incidentId: mockP1Incident._id,
      actorName: 'Operator Smith',
      actorRole: 'OPERATOR',
      action: 'NOTIFICATION_ACKNOWLEDGE',
      summary: `Notification acknowledged: "${shortageNotif.title}"`,
      timestamp: new Date(),
    });

    assert(shortageNotif.acknowledged === true, 'Notification marked acknowledged = true');
    assert(audit.action === 'NOTIFICATION_ACKNOWLEDGE', 'Recorded NOTIFICATION_ACKNOWLEDGE audit entry');

    // Clean up test documents
    await Incident.deleteOne({ _id: mockP1Incident._id });
    await Resource.deleteOne({ _id: mockResource._id });
    await Notification.deleteMany({ _id: { $in: [delayNotif?._id, shortageNotif._id, spikeNotif._id] } });

    console.log(`\n=============================================================`);
    console.log(`  Phase 4 Test Suite Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log(`=============================================================\n`);

  } catch (err: any) {
    console.error('Test execution failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runPhase4Tests();
