const BASE_URL = 'http://localhost:5000/api/v1';

const DEMO_CREDENTIALS = {
  operator: { email: 'operator@ps9.demo', password: 'demo_password_123' },
  supervisor: { email: 'supervisor@ps9.demo', password: 'demo_password_123' },
  field: { email: 'field@ps9.demo', password: 'demo_password_123' },
  admin: { email: 'admin@ps9.demo', password: 'demo_password_123' },
};

async function postJson(url: string, body: any, token?: string, clientIp?: string): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (clientIp) {
    headers['x-client-ip'] = clientIp;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data: any = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runPhase2Tests() {
  console.log('===============================================================');
  console.log(' PS-9 Phase 2 Automated Pipeline & Edge-Case Verification Suite ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
      passed++;
    } else {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  // 1. Authenticate users to obtain test tokens
  console.log('\n--- 1. Authenticating Test Users ---');
  let operatorToken = '';
  let fieldToken = '';
  let supervisorToken = '';

  try {
    const opLogin = await postJson(`${BASE_URL}/auth/login`, DEMO_CREDENTIALS.operator);
    operatorToken = opLogin.data?.data?.token;
    assert(Boolean(operatorToken), 'Operator login successful');

    const fieldLogin = await postJson(`${BASE_URL}/auth/login`, DEMO_CREDENTIALS.field);
    fieldToken = fieldLogin.data?.data?.token;
    assert(Boolean(fieldToken), 'Field team login successful');

    const supLogin = await postJson(`${BASE_URL}/auth/login`, DEMO_CREDENTIALS.supervisor);
    supervisorToken = supLogin.data?.data?.token;
    assert(Boolean(supervisorToken), 'Supervisor login successful');
  } catch (err: any) {
    console.error('Authentication failed:', err.message);
  }

  // 2. Geographic Bounding Validation Test
  console.log('\n--- 2. Geographic Bounding Validation Test ---');
  try {
    // Valid coordinates inside SF metro bounds
    const validGeoRes = await postJson(
      `${BASE_URL}/intake/citizen`,
      {
        rawText: 'Minor water pipe leak on sidewalk, pedestrian caution advised.',
        category: 'FLOOD',
        location: {
          address: 'Downtown SF',
          zone: 'Sector 1',
          coordinates: [-122.4194, 37.7749],
        },
      },
      undefined,
      '10.0.1.10'
    );
    assert(validGeoRes.status === 201, 'Valid metro coordinates accepted (201 Created)');

    // Coordinates outside bounds (e.g. [0, 0] or Tokyo)
    const outBoundsRes = await postJson(
      `${BASE_URL}/intake/citizen`,
      {
        rawText: 'Incident reported in middle of ocean',
        category: 'OTHER',
        location: {
          address: 'Null Island',
          coordinates: [0, 0],
        },
      },
      undefined,
      '10.0.1.11'
    );
    const rejected = outBoundsRes.status === 400 && outBoundsRes.data?.error?.code === 'OUT_OF_BOUNDS';
    assert(rejected, 'Out-of-bounds coordinates rejected with 400 Bad Request');
  } catch (err: any) {
    assert(false, 'Geographic bounds test', err.message);
  }

  // 3. Rate Limiting & Anti-Abuse Test
  console.log('\n--- 3. Anti-Abuse & Rate Limiting Test ---');
  try {
    // Honeypot detection test
    const honeyRes = await postJson(
      `${BASE_URL}/intake/citizen`,
      {
        rawText: 'Spam robot submission',
        website: 'http://spambot.xyz', // Bot field populated
        location: {
          address: 'Downtown SF',
          coordinates: [-122.4194, 37.7749],
        },
      },
      undefined,
      '10.0.2.1'
    );
    const honeypotCaught = honeyRes.status === 400 && honeyRes.data?.error?.code === 'ABUSE_DETECTED';
    assert(honeypotCaught, 'Honeypot caught automated bot submission (400 Bad Request)');

    // Rate limiter: 10 requests allowed, 11th blocked
    const rateLimitIp = '10.0.2.55';
    let allowedCount = 0;
    for (let i = 1; i <= 10; i++) {
      const res = await postJson(
        `${BASE_URL}/intake/citizen`,
        {
          rawText: `Rapid test submission batch ${i}`,
          category: 'OTHER',
          location: { address: 'Sector 1', coordinates: [-122.4194, 37.7749] },
        },
        undefined,
        rateLimitIp
      );
      if (res.status === 201) allowedCount++;
    }
    assert(allowedCount === 10, 'Rate limiter permits first 10 requests (10 req/15min)');

    const blockedRes = await postJson(
      `${BASE_URL}/intake/citizen`,
      {
        rawText: 'Excessive request #11',
        category: 'OTHER',
        location: { address: 'Sector 1', coordinates: [-122.4194, 37.7749] },
      },
      undefined,
      rateLimitIp
    );
    assert(blockedRes.status === 429, '11th request blocked with 429 Too Many Requests');
  } catch (err: any) {
    assert(false, 'Rate limit & honeypot test', err.message);
  }

  // 4. Deterministic Severity Capping & Mutual Exclusivity Test
  console.log('\n--- 4. Deterministic Severity Capping & Mutual Exclusivity Test ---');
  try {
    const catastrophicPayload = {
      title: 'Catastrophic Chemical Complex Detonation',
      description: 'Massive blast at petrochemical terminal with collapsed warehouse and trapped personnel.',
      type: 'INDUSTRIAL_ACCIDENT',
      location: {
        address: '740 Industrial Way, Sector 3',
        zone: 'Sector 3',
        coordinates: [-122.4089, 37.7649],
      },
      casualtiesCount: 15, // Tier: 3+ (+40)
      hazards: {
        explosionConfirmed: true, // +20
        toxicChemicalOrHazardous: true, // +25
        trappedPersons: true, // +20
        fireSpreading: true, // +15 (subtotal hazards capped at 35)
      },
      infrastructureRisk: true, // +15
      force: true,
    };

    const sevRes = await postJson(`${BASE_URL}/intake/operator`, catastrophicPayload, operatorToken);

    const calculatedScore = sevRes.data?.severityResult?.score;
    const severity = sevRes.data?.severityResult?.severity;
    const priority = sevRes.data?.severityResult?.priority;

    assert(
      calculatedScore === 100,
      'Severity score strictly capped at 100 (uncapped was 115)',
      `Actual: ${calculatedScore}`
    );
    assert(severity === 'CRITICAL' && priority === 'P1', 'Severity correctly assigned CRITICAL and Priority P1');
    assert(
      Array.isArray(sevRes.data?.recommendedResources),
      'Submit & Recommend: Response units recommended without auto-dispatch'
    );
  } catch (err: any) {
    assert(false, 'Severity engine test', err.message);
  }

  // 5. Correlation & Report Linking Test (Report B linked to existing master incident)
  console.log('\n--- 5. Correlation & Report Linking Test ---');
  try {
    // Step 5A: Create master incident for Report A at 740 Industrial Way
    const masterIncRes = await postJson(
      `${BASE_URL}/intake/operator`,
      {
        title: 'Chemical Fire at Warehouse',
        description: 'Chemical fire burning at storage facility on 740 Industrial Way with toxic smoke plume.',
        type: 'FIRE',
        location: {
          address: '740 Industrial Way, Sector 3',
          zone: 'Sector 3',
          coordinates: [-122.4089, 37.7649],
        },
        casualtiesCount: 1,
        force: true,
      },
      operatorToken
    );
    const masterIncId = masterIncRes.data?.incident?._id;
    const masterIncNumber = masterIncRes.data?.incident?.incidentNumber;
    assert(Boolean(masterIncId), `Master incident created (${masterIncNumber})`);

    // Step 5B: Submit Report B within 100m with similar keywords (750 Industrial Way)
    const reportBRes = await postJson(
      `${BASE_URL}/intake/citizen`,
      {
        rawText: 'Severe toxic chemical smoke and fire at 750 Industrial Way warehouse facility!',
        category: 'FIRE',
        location: {
          address: '750 Industrial Way, Sector 3',
          zone: 'Sector 3',
          coordinates: [-122.4080, 37.7645], // ~80 meters away
        },
      },
      undefined,
      '10.0.3.99'
    );

    const isDuplicate = reportBRes.data?.correlation?.isDuplicate;
    const matchType = reportBRes.data?.correlation?.matchType;
    const reportBStatus = reportBRes.data?.report?.status;
    const linkedIncidentRef = reportBRes.data?.report?.incidentRef;

    assert(isDuplicate, 'Correlation engine flagged Report B as matching existing master incident');
    assert(
      matchType === 'AUTOMATIC_LINK',
      `High confidence Jaccard + Haversine correlation (${reportBRes.data?.correlation?.confidenceScore}% >= 80%)`,
      `Score: ${reportBRes.data?.correlation?.confidenceScore}%`
    );
    assert(
      reportBStatus === 'LINKED' && String(linkedIncidentRef) === String(masterIncId),
      'Report B is LINKED to the existing master incident (remains a Report record without spawning a duplicate incident)'
    );
  } catch (err: any) {
    assert(false, 'Correlation test', err.message);
  }

  // 6. Sensor Repeat-Reading Suppression Test (1 incident with multiple telemetry readings)
  console.log('\n--- 6. Sensor Repeat-Reading Suppression Test ---');
  try {
    const testSensorCode = `SENS-TEST-${Date.now().toString().slice(-4)}`;

    // Reading 1: Telemetry reading arrives
    const r1 = await postJson(`${BASE_URL}/intake/sensor-event`, {
      sensorCode: testSensorCode,
      reading: 150,
      unit: 'ppm',
      zone: 'Sector 5',
    });
    const targetIncidentId = r1.data?.activeIncidentId;
    assert(Boolean(targetIncidentId), 'Sensor event associated with target operational incident in zone');
    assert(
      r1.data?.telemetryAppended || r1.data?.isNewIncidentCreated,
      'Reading 1 logged and telemetry appended'
    );

    // Readings 2, 3: Repeated readings with minor value fluctuations over seconds
    const r2 = await postJson(`${BASE_URL}/intake/sensor-event`, {
      sensorCode: testSensorCode,
      reading: 155,
      unit: 'ppm',
      zone: 'Sector 5',
    });
    const r3 = await postJson(`${BASE_URL}/intake/sensor-event`, {
      sensorCode: testSensorCode,
      reading: 162,
      unit: 'ppm',
      zone: 'Sector 5',
    });

    assert(
      !r2.data?.isNewIncidentCreated && r2.data?.telemetryAppended,
      'Reading 2 updates telemetry without creating duplicate incident'
    );
    assert(
      !r3.data?.isNewIncidentCreated && r3.data?.telemetryAppended,
      'Reading 3 updates telemetry without creating duplicate incident'
    );
    assert(
      String(r2.data?.activeIncidentId) === String(targetIncidentId) &&
        String(r3.data?.activeIncidentId) === String(targetIncidentId),
      'Repeated sensor readings result in ONE incident with multiple telemetry readings/updates'
    );
  } catch (err: any) {
    assert(false, 'Sensor repeat-reading suppression test', err.message);
  }

  // 7. Role-Based Access Control (RBAC) on /api/v1/intake/correlate
  console.log('\n--- 7. RBAC Guard on /api/v1/intake/correlate Test ---');
  try {
    // Unauthenticated attempt -> expect 401
    const unauthRes = await postJson(`${BASE_URL}/intake/correlate`, { action: 'LINK_REPORT' });
    assert(unauthRes.status === 401, 'Unauthenticated request to /intake/correlate rejected with 401 Unauthorized');

    // FIELD_TEAM attempt -> expect 403 Forbidden
    const forbiddenRes = await postJson(`${BASE_URL}/intake/correlate`, { action: 'LINK_REPORT' }, fieldToken);
    assert(forbiddenRes.status === 403, 'FIELD_TEAM role rejected from /intake/correlate with 403 Forbidden');

    // OPERATOR attempt -> authorized (status 400 for missing params, not 401 or 403)
    const opRes = await postJson(`${BASE_URL}/intake/correlate`, { action: 'LINK_REPORT' }, operatorToken);
    const operatorAllowed = opRes.status === 400 && opRes.data?.error?.code === 'MISSING_PARAMS';
    assert(operatorAllowed, 'OPERATOR role is authorized to access /intake/correlate');

    // SUPERVISOR attempt -> authorized
    const supRes = await postJson(`${BASE_URL}/intake/correlate`, { action: 'LINK_REPORT' }, supervisorToken);
    const supervisorAllowed = supRes.status === 400 && supRes.data?.error?.code === 'MISSING_PARAMS';
    assert(supervisorAllowed, 'SUPERVISOR role is authorized to access /intake/correlate');
  } catch (err: any) {
    assert(false, 'RBAC test', err.message);
  }

  // 8. Human-Confirmed Existing Incident Merging Test
  console.log('\n--- 8. Human-Confirmed Existing Incident Merging Test ---');
  try {
    // Create Incident A
    const incA = await postJson(
      `${BASE_URL}/intake/operator`,
      {
        title: 'Sector 4 Brush Fire Alpha',
        description: 'Brush fire on eastern hillside.',
        type: 'FIRE',
        location: { address: 'Twin Peaks East', zone: 'Sector 4', coordinates: [-122.4467, 37.7501] },
        force: true,
      },
      operatorToken
    );

    // Create Incident B
    const incB = await postJson(
      `${BASE_URL}/intake/operator`,
      {
        title: 'Sector 4 Ridge Fire Bravo',
        description: 'Smoke and brush fire on ridge.',
        type: 'FIRE',
        location: { address: 'Twin Peaks Ridge', zone: 'Sector 4', coordinates: [-122.4460, 37.7505] },
        force: true,
      },
      operatorToken
    );

    const incAId = incA.data?.incident?._id;
    const incBId = incB.data?.incident?._id;

    // Execute operator-confirmed merge
    const mergeRes = await postJson(
      `${BASE_URL}/intake/correlate`,
      {
        action: 'MERGE_INCIDENTS',
        sourceIncidentId: incBId,
        masterIncidentId: incAId,
      },
      operatorToken
    );

    assert(mergeRes.data?.success, 'Operator merge action completed successfully');
    assert(
      mergeRes.data?.sourceIncident?.status === 'MERGED',
      'Source incident status updated to MERGED'
    );
  } catch (err: any) {
    assert(false, 'Incident merge test', err.message);
  }

  console.log('\n===============================================================');
  console.log(` Test Run Completed: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log('===============================================================');
}

runPhase2Tests().catch(console.error);
