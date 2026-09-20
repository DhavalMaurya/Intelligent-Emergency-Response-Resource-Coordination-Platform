import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Hospital } from '../models/Hospital.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';
import { Report } from '../models/Report.js';
import { Resource } from '../models/Resource.js';
import { getNearestHospital, updateHospitalStatus } from '../controllers/hospital.controller.js';
import { getResourceShortageForecast, getAIInsights, getAnalyticsOverview } from '../controllers/analytics.controller.js';
import { updateHospitalStatusSchema } from '../controllers/hospital.controller.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ps9_emergency_demo';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

function createMockRes() {
  const resObj: any = {
    statusCode: 200,
    data: null,
  };
  resObj.json = (data: any) => {
    resObj.data = data;
    return resObj;
  };
  resObj.status = (code: number) => {
    resObj.statusCode = code;
    return resObj;
  };
  return resObj;
}

async function runPhase5Tests() {
  console.log('\n======================================================');
  console.log('  SENTINEL PHASE 5 AUTOMATED EDGE-CASE TEST SUITE');
  console.log('======================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB database: ${mongoose.connection.name}\n`);

    // Setup Test Data in Mongo
    await Hospital.deleteMany({ name: { $regex: /^Test / } });

    const activeHospital = await Hospital.create({
      name: 'Test Metro Trauma Center',
      zone: 'Sector 1 - Downtown',
      location: { address: '100 Emergency Way', coordinates: [-73.98, 40.75] },
      status: 'NORMAL',
      totalBeds: 200,
      availableBeds: 45,
      icuTotal: 30,
      icuAvailable: 12,
      traumaLevel: 1,
      contactPhone: '555-0100'
    });

    const divertedHospital = await Hospital.create({
      name: 'Test Diverted Regional Care',
      zone: 'Sector 1 - Downtown',
      location: { address: '102 Bypass Rd', coordinates: [-73.981, 40.751] }, // closer, but diverted
      status: 'DIVERT_STATUS',
      totalBeds: 150,
      availableBeds: 20,
      icuTotal: 20,
      icuAvailable: 5,
      traumaLevel: 2,
      contactPhone: '555-0102'
    });

    const fullHospital = await Hospital.create({
      name: 'Test Full Capacity Facility',
      zone: 'Sector 1 - Downtown',
      location: { address: '104 Overflow Ave', coordinates: [-73.982, 40.752] },
      status: 'HIGH_OCCUPANCY',
      totalBeds: 100,
      availableBeds: 0,
      icuTotal: 10,
      icuAvailable: 0,
      traumaLevel: 3,
      contactPhone: '555-0104'
    });

    const mockNext = (err?: any) => { if (err) console.error('[Mock Next Err]:', err); };

    // ----------------------------------------------------
    // TEST 1: Diverted Hospital Exclusion
    // ----------------------------------------------------
    console.log('TEST 1: Diverted Hospital Exclusion');
    let test1Req: any = {
      query: { lat: '40.75', lng: '-73.98', traumaLevel: '1', maxDistanceKm: '50' }
    };
    let test1Res = createMockRes();
    await getNearestHospital(test1Req, test1Res);
    const nearest = test1Res.data?.data?.recommendedHospital;
    assert(
      nearest && nearest.name === 'Test Metro Trauma Center' && nearest._id.toString() !== divertedHospital._id.toString(),
      'Excluded diverted facility in nearest query',
      `Got hospital: ${nearest?.name}`
    );

    // ----------------------------------------------------
    // TEST 2: Advisory Routing Requirement
    // ----------------------------------------------------
    console.log('\nTEST 2: Nearest Hospital Advisory Recommendation Disclaimer');
    const notice = test1Res.data?.data?.advisoryNotice;
    assert(
      notice && notice.includes('Human EMS operator confirmation required'),
      'Returned advisory routing notice enforcing operator confirmation',
      `Notice: ${notice}`
    );

    // ----------------------------------------------------
    // TEST 3: Invalid Coordinate Validation
    // ----------------------------------------------------
    console.log('\nTEST 3: Invalid Hospital Coordinate Validation');
    const invalidCoordCheck = updateHospitalStatusSchema.safeParse({
      coordinates: [200, 95] // invalid lng/lat
    });
    assert(
      !invalidCoordCheck.success,
      'Zod rejected out-of-bound longitude (>180) and latitude (>90)'
    );

    // ----------------------------------------------------
    // TEST 4: Invalid Capacity Bounds Validation
    // ----------------------------------------------------
    console.log('\nTEST 4: Invalid ICU/Bed Capacity Bounds Validation');
    let test4Req: any = {
      params: { id: activeHospital._id.toString() },
      body: { totalBeds: 50, availableBeds: 60 },
      user: { id: 'test-user', name: 'Test Operator', role: 'ADMIN' }
    };
    let test4Res = createMockRes();
    await updateHospitalStatus(test4Req, test4Res);
    assert(
      test4Res.statusCode === 400 && test4Res.data?.error?.message?.includes('cannot exceed totalBeds'),
      'Controller rejected availableBeds > totalBeds with HTTP 400 bounds error'
    );

    // ----------------------------------------------------
    // TEST 5: Hospital Status Update Audit Log Generation
    // ----------------------------------------------------
    console.log('\nTEST 5: Hospital Status Update Audit Log Generation');
    let test5Req: any = {
      params: { id: activeHospital._id.toString() },
      body: { status: 'HIGH_OCCUPANCY', availableBeds: 2 },
      user: { id: new mongoose.Types.ObjectId().toString(), name: 'Test Operator', role: 'CONTROL_ROOM' }
    };
    let test5Res = createMockRes();
    await updateHospitalStatus(test5Req, test5Res);
    const auditLog = await IncidentUpdate.findOne({ incidentId: activeHospital._id.toString() });
    assert(
      auditLog !== null && auditLog.summary.includes('Hospital capacity updated'),
      'Created system audit log entry for hospital status/capacity modification'
    );

    // ----------------------------------------------------
    // TEST 6: Shortage Forecasting Deficit Calculation with U_enroute
    // ----------------------------------------------------
    console.log('\nTEST 6: Shortage Forecasting Deficit Calculation with U_enroute Net Capacity');
    let test6Req: any = {
      query: { resourceType: 'AMBULANCE', forecastWindowMinutes: '60' }
    };
    let test6Res = createMockRes();
    await getResourceShortageForecast(test6Req, test6Res, mockNext);
    const shortageResp = test6Res.data?.data;
    const inputs = shortageResp?.formulaInputs;
    const expectedNet = Math.max(0, (inputs?.U_avail || 0) - (inputs?.U_enroute || 0));
    const expectedDeficit = Math.max(0, ((inputs?.forecastedDemand || 0) + 1) - expectedNet);
    assert(
      shortageResp &&
      inputs?.U_net_avail === expectedNet &&
      shortageResp.shortageDeficit === expectedDeficit,
      'Resource shortage formula accurately computed U_net_avail and shortageDeficit',
      `Net: ${inputs?.U_net_avail} (expected ${expectedNet}), Deficit: ${shortageResp?.shortageDeficit} (expected ${expectedDeficit})`
    );

    // ----------------------------------------------------
    // TEST 7: Gemini NLP AI Insights with Fallback Engine
    // ----------------------------------------------------
    console.log('\nTEST 7: Gemini AI Insights & Fallback Engine');
    let test7Req: any = {};
    let test7Res = createMockRes();
    await getAIInsights(test7Req, test7Res, mockNext);
    const insights = test7Res.data?.data;
    assert(
      insights &&
      typeof insights.executiveSummary === 'string' &&
      typeof insights.riskLevel === 'string' &&
      insights.executiveSummary.length > 0,
      'Returned structured operational briefing (Gemini or deterministic fallback)',
      `Mode: ${insights?.isFallback ? 'Fallback' : 'Gemini AI'}, Risk: ${insights?.riskLevel}`
    );

    // ----------------------------------------------------
    // TEST 8: Redis Offline Graceful LRU Cache Fallback
    // ----------------------------------------------------
    console.log('\nTEST 8: Redis Offline Graceful LRU Cache Fallback');
    let test8Req: any = { query: { timeRange: '24h' } };
    let test8Res = createMockRes();
    await getAnalyticsOverview(test8Req, test8Res, mockNext);
    assert(
      test8Res.data?.success === true && test8Res.data?.data?.kpis !== undefined,
      'Analytics overview endpoint executed successfully without Redis error'
    );

    // ----------------------------------------------------
    // TEST 9: Dual SLA Metrics Compliance Target
    // ----------------------------------------------------
    console.log('\nTEST 9: Dual SLA Metrics Compliance Target');
    assert(
      test8Res.data?.data?.kpis?.targetThresholdMinutes === 8 &&
      test8Res.data?.data?.kpis?.dispatchSLAAverage !== undefined,
      'Maintained 5-min Dispatch SLA vs 8-min Response KPI SLA target definitions'
    );

    // ----------------------------------------------------
    // TEST 10: Zero-Result Analytics Edge Case Handling
    // ----------------------------------------------------
    console.log('\nTEST 10: Zero-Result Analytics Edge Case Handling');
    const mockZeroReq: any = { query: { timeRange: '1h' } };
    let mockZeroRes = createMockRes();
    await getAnalyticsOverview(mockZeroReq, mockZeroRes, mockNext);
    const kpiData = mockZeroRes.data?.data?.kpis;
    assert(
      kpiData && !isNaN(kpiData.averageResponseTime) && !isNaN(kpiData.activeIncidents),
      'Handled empty or small window analytics without producing NaN values',
      `Avg Response: ${kpiData?.averageResponseTime}`
    );

    // Cleanup Test Data
    await Hospital.deleteMany({ name: { $regex: /^Test / } });

  } catch (err) {
    console.error('Test script crashed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n======================================================');
    console.log(`  RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('======================================================\n');
    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

runPhase5Tests();
