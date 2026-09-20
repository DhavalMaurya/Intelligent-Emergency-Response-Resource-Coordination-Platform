import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';
import { Resource } from '../models/Resource.js';
import { Report } from '../models/Report.js';
import { Team } from '../models/Team.js';
import { Vehicle } from '../models/Vehicle.js';
import { Hospital } from '../models/Hospital.js';
import { Sensor } from '../models/Sensor.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';
import { Notification } from '../models/Notification.js';

// Base coordinates for synthetic metropolitan area (Simulated Metro EOC Grid)
const METRO_CENTER = { lat: 37.7749, lng: -122.4194 };

export const runSeed = async () => {
  if (env.NODE_ENV === 'production' && !env.ENABLE_DEMO_SEEDING) {
    console.error('[Seed Error] Demo seeding is strictly disabled in production environments.');
    process.exit(1);
  }

  console.log('--- Starting PS-9 Synthetic EOC Demo Data Seeding ---');
  await connectDB();

  // Clear existing demo collections
  console.log('[Seed] Purging previous demo data...');
  await Promise.all([
    User.deleteMany({}),
    Incident.deleteMany({}),
    Resource.deleteMany({}),
    Report.deleteMany({}),
    Team.deleteMany({}),
    Vehicle.deleteMany({}),
    Hospital.deleteMany({}),
    Sensor.deleteMany({}),
    IncidentUpdate.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  await Hospital.collection.dropIndexes().catch(() => {});

  // 1. Seed Users (Development-Only Passwords)
  console.log('[Seed] Generating role accounts (Development/Demo Mode)...');
  const passwordHash = await bcrypt.hash(env.DEMO_SEED_PASSWORD, 10);

  const [operatorUser, supervisorUser, fieldUser, adminUser] = await User.create([
    {
      email: 'operator@ps9.demo',
      passwordHash,
      name: 'Alex Rivera',
      role: 'OPERATOR',
      badgeNumber: 'OP-408',
      department: 'Emergency Dispatch & Coordination',
    },
    {
      email: 'supervisor@ps9.demo',
      passwordHash,
      name: 'Capt. Elena Vance',
      role: 'CONTROL_ROOM',
      badgeNumber: 'SUP-102',
      department: 'Operations Command Center',
    },
    {
      email: 'field@ps9.demo',
      passwordHash,
      name: 'Jordan Reed',
      role: 'FIELD_TEAM',
      badgeNumber: 'EMS-77',
      department: 'Paramedic Rapid Response',
    },
    {
      email: 'admin@ps9.demo',
      passwordHash,
      name: 'Marcus Chen',
      role: 'ADMIN',
      badgeNumber: 'SYS-01',
      department: 'EOC Systems Administration',
    },
  ]);

  // 2. Seed Hospitals
  console.log('[Seed] Generating synthetic hospital facilities...');
  const hospitals = await Hospital.create([
    {
      name: 'Metro General Hospital & Trauma Center',
      zone: 'Sector 1 - Downtown',
      location: {
        address: '100 Metro Health Plaza, Sector 1',
        coordinates: [-122.418, 37.776],
      },
      traumaLevel: 1,
      totalBeds: 450,
      availableBeds: 34,
      icuAvailable: 4,
      status: 'NORMAL',
      contactPhone: '555-0101',
    },
    {
      name: 'Harbour Bay Medical Center',
      zone: 'Sector 2 - Harbour',
      location: {
        address: '50 Harbour Bay Way, Sector 2',
        coordinates: [-122.405, 37.781],
      },
      traumaLevel: 2,
      totalBeds: 280,
      availableBeds: 18,
      icuAvailable: 2,
      status: 'NORMAL',
      contactPhone: '555-0102',
    },
    {
      name: 'St. Jude Industrial Health Center',
      zone: 'Sector 3 - Industrial Corridor',
      location: {
        address: '300 Port Authority Blvd, Sector 3',
        coordinates: [-122.392, 37.755],
      },
      traumaLevel: 2,
      totalBeds: 180,
      availableBeds: 0,
      icuAvailable: 0,
      status: 'DIVERT_STATUS',
      contactPhone: '555-0103',
    },
    {
      name: 'Northgate Community Hospital',
      zone: 'Sector 4 - Residential North',
      location: {
        address: '800 Northgate Ridge Rd, Sector 4',
        coordinates: [-122.435, 37.795],
      },
      traumaLevel: 3,
      totalBeds: 210,
      availableBeds: 52,
      icuAvailable: 8,
      status: 'NORMAL',
      contactPhone: '555-0104',
    },
  ]);

  // 3. Seed Resources (Ambulances, Fire Engines, Rescue Teams, Hazmat)
  console.log('[Seed] Generating synthetic emergency fleets...');
  const resources = await Resource.create([
    {
      identifier: 'ALS-01',
      name: 'Medic 01 (Advanced Life Support)',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      baseStation: 'Station 1 - Central Downtown',
      zone: 'Sector 1 - Downtown',
      currentLocation: [-122.417, 37.775],
      capabilities: ['CARDIAC_MONITOR', 'TRAUMA_KIT', 'PEDIATRIC_ADVANCED'],
      capacity: 2,
      crewCount: 2,
      fuelLevelPercent: 92,
    },
    {
      identifier: 'ALS-02',
      name: 'Medic 02 (Advanced Life Support)',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      baseStation: 'Station 4 - Harbour Basin',
      zone: 'Sector 2 - Harbour',
      currentLocation: [-122.408, 37.78],
      capabilities: ['CARDIAC_MONITOR', 'TRAUMA_KIT'],
      capacity: 2,
      crewCount: 2,
      fuelLevelPercent: 88,
    },
    {
      identifier: 'ALS-03',
      name: 'Medic 03 (Rapid Transport)',
      type: 'AMBULANCE',
      status: 'BUSY',
      baseStation: 'Station 7 - South Industrial',
      zone: 'Sector 3 - Industrial Corridor',
      currentLocation: [-122.395, 37.758],
      capabilities: ['CARDIAC_MONITOR', 'BURN_KIT'],
      capacity: 2,
      crewCount: 2,
      fuelLevelPercent: 74,
    },
    {
      identifier: 'ALS-04',
      name: 'Medic 04 (Advanced Life Support)',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      baseStation: 'Station 12 - North Hills',
      zone: 'Sector 4 - Residential North',
      currentLocation: [-122.431, 37.792],
      capabilities: ['CARDIAC_MONITOR', 'TRAUMA_KIT'],
      capacity: 2,
      crewCount: 2,
      fuelLevelPercent: 95,
    },
    {
      identifier: 'ALS-05',
      name: 'Medic 05 (Critical Care Transport)',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      baseStation: 'Station 9 - Transit Plaza',
      zone: 'Sector 5 - Transit Hub',
      currentLocation: [-122.412, 37.784],
      capabilities: ['VENTILATOR', 'CARDIAC_MONITOR', 'ICU_TRANSPORT'],
      capacity: 2,
      crewCount: 3,
      fuelLevelPercent: 80,
    },
    {
      identifier: 'FE-01',
      name: 'Engine 01 (Type 1 Pumper)',
      type: 'FIRE_TRUCK',
      status: 'AVAILABLE',
      baseStation: 'Station 1 - Central Downtown',
      zone: 'Sector 1 - Downtown',
      currentLocation: [-122.42, 37.777],
      capabilities: ['WATER_1000G', 'FOAM_SYSTEM', 'HEAVY_EXTRICATION'],
      capacity: 4,
      crewCount: 4,
      fuelLevelPercent: 90,
    },
    {
      identifier: 'FE-02',
      name: 'Engine 02 (Industrial Pumper)',
      type: 'FIRE_TRUCK',
      status: 'ON_SCENE',
      baseStation: 'Station 7 - South Industrial',
      zone: 'Sector 3 - Industrial Corridor',
      currentLocation: [-122.391, 37.754],
      capabilities: ['HIGH_VOLUME_PUMP', 'CHEMICAL_FOAM', 'DECON_SHOWER'],
      capacity: 4,
      crewCount: 4,
      fuelLevelPercent: 65,
    },
    {
      identifier: 'FE-03',
      name: 'Ladder 03 (105ft Aerial Platform)',
      type: 'FIRE_TRUCK',
      status: 'EN_ROUTE',
      baseStation: 'Station 4 - Harbour Basin',
      zone: 'Sector 2 - Harbour',
      currentLocation: [-122.404, 37.779],
      capabilities: ['AERIAL_LADDER', 'HIGH_ANGLE_RESCUE', 'WATER_CANON'],
      capacity: 4,
      crewCount: 4,
      fuelLevelPercent: 82,
    },
    {
      identifier: 'RSC-01',
      name: 'Heavy Rescue Squad 01',
      type: 'RESCUE_TEAM',
      status: 'AVAILABLE',
      baseStation: 'Station 1 - Central Downtown',
      zone: 'Sector 1 - Downtown',
      currentLocation: [-122.415, 37.772],
      capabilities: ['COLLAPSE_SHORING', 'TRENCH_RESCUE', 'HYDRAULIC_CUTTERS'],
      capacity: 6,
      crewCount: 5,
      fuelLevelPercent: 94,
    },
    {
      identifier: 'HAZ-01',
      name: 'Hazmat Response Unit 01',
      type: 'HAZMAT_UNIT',
      status: 'ON_SCENE',
      baseStation: 'Station 7 - South Industrial',
      zone: 'Sector 3 - Industrial Corridor',
      currentLocation: [-122.389, 37.753],
      capabilities: ['GAS_CHROMATOGRAPHY', 'LEVEL_A_SUITS', 'DECONTAMINATION'],
      capacity: 4,
      crewCount: 4,
      fuelLevelPercent: 78,
    },
    {
      identifier: 'POL-01',
      name: 'Traffic Division Unit 104',
      type: 'POLICE_UNIT',
      status: 'ON_SCENE',
      baseStation: 'Central Precinct',
      zone: 'Sector 2 - Harbour',
      currentLocation: [-122.402, 37.783],
      capabilities: ['PERIMETER_CONTROL', 'ACCIDENT_INVESTIGATION'],
      capacity: 2,
      crewCount: 2,
      fuelLevelPercent: 85,
    },
    {
      identifier: 'POL-02',
      name: 'Patrol Cruiser 208',
      type: 'POLICE_UNIT',
      status: 'AVAILABLE',
      baseStation: 'West Precinct',
      zone: 'Sector 4 - Residential North',
      currentLocation: [-122.428, 37.798],
      capabilities: ['RAPID_RESPONSE', 'FIRST_AID'],
      capacity: 2,
      crewCount: 2,
      fuelLevelPercent: 91,
    },
  ]);

  // 4. Seed Sensors
  console.log('[Seed] Generating synthetic environmental sensors...');
  await Sensor.create([
    {
      sensorCode: 'SENS-IND-301',
      type: 'SMOKE',
      zone: 'Sector 3 - Industrial Corridor',
      location: [-122.39, 37.7535],
      currentReading: 94.2,
      unit: '% obscuration',
      warningThreshold: 45,
      criticalThreshold: 80,
      status: 'CRITICAL',
    },
    {
      sensorCode: 'SENS-IND-302',
      type: 'TEMPERATURE',
      zone: 'Sector 3 - Industrial Corridor',
      location: [-122.3905, 37.7538],
      currentReading: 112.5,
      unit: '°C',
      warningThreshold: 60,
      criticalThreshold: 95,
      status: 'CRITICAL',
    },
    {
      sensorCode: 'SENS-FL-101',
      type: 'WATER_LEVEL',
      zone: 'Sector 2 - Harbour',
      location: [-122.401, 37.782],
      currentReading: 3.4,
      unit: 'meters (sea-level delta)',
      warningThreshold: 2.5,
      criticalThreshold: 3.8,
      status: 'WARNING',
    },
    {
      sensorCode: 'SENS-GAS-303',
      type: 'GAS_HAZARD',
      zone: 'Sector 3 - Industrial Corridor',
      location: [-122.392, 37.756],
      currentReading: 68.0,
      unit: 'PPM (VOC / Sulfur)',
      warningThreshold: 25,
      criticalThreshold: 50,
      status: 'CRITICAL',
    },
    {
      sensorCode: 'SENS-TMP-501',
      type: 'TEMPERATURE',
      zone: 'Sector 5 - Transit Hub',
      location: [-122.411, 37.785],
      currentReading: 23.4,
      unit: '°C',
      warningThreshold: 40,
      criticalThreshold: 60,
      status: 'NORMAL',
    },
  ]);

  // 5. Seed Incidents (Synthetic Demo Records)
  console.log('[Seed] Generating synthetic incidents...');
  const now = new Date();

  const incident1 = await Incident.create({
    incidentNumber: 'INC-2026-1042',
    title: 'Chemical Warehouse Multi-Alarm Fire & Hazmat Threat',
    description: 'Tier 3 structure fire at chemical manufacturing facility. Heavy toxic smoke venting towards transit corridor. Confirmed multiple workers trapped on floor 2.',
    type: 'INDUSTRIAL_ACCIDENT',
    severity: 'CRITICAL',
    priority: 'P1',
    status: 'DELAYED',
    location: {
      address: '740 Industrial Way, Bldg C',
      zone: 'Sector 3 - Industrial Corridor',
      coordinates: [-122.3912, 37.7541],
    },
    casualtiesCount: 3,
    hazardLevel: 'EXTREME_HAZMAT',
    tags: ['CHEMICAL_FIRE', 'TOXIC_PLUME', 'TRAPPED_PERSONS', 'DELAYED_DISPATCH'],
    assignedResources: [resources[6]._id, resources[9]._id], // FE-02, HAZ-01
    primaryReporterId: operatorUser._id,
    aiSummary: 'Situation Briefing: Critical chemical warehouse blaze with hazardous VOC discharge. 3 injuries confirmed. Secondary containment breached. Resource availability in Sector 3 is stressed; additional ambulance units urgently needed.',
    responseMetrics: {
      detectionTimestamp: new Date(now.getTime() - 24 * 60000),
      dispatchedTimestamp: new Date(now.getTime() - 12 * 60000),
      dispatchDelayMinutes: 12,
    },
    escalationReason: 'Ambulance dispatch delayed beyond 10-minute threshold due to regional transit congestion.',
  });

  const incident2 = await Incident.create({
    incidentNumber: 'INC-2026-1043',
    title: 'Multi-Vehicle Collision with Fuel Spillage',
    description: 'Four vehicles involved including a commercial fuel tanker on Harbour Expressway Northbound. Two lanes obstructed, fuel leakage observed near storm drainage.',
    type: 'ROAD_ACCIDENT',
    severity: 'HIGH',
    priority: 'P2',
    status: 'ASSIGNED',
    location: {
      address: 'Harbour Expressway MP 14.2',
      zone: 'Sector 2 - Harbour',
      coordinates: [-122.4035, 37.7815],
    },
    casualtiesCount: 2,
    hazardLevel: 'FLAMMABLE_LIQUIDS',
    tags: ['EXPRESSWAY_CRASH', 'FUEL_SPILL', 'LANE_BLOCKAGE'],
    assignedResources: [resources[7]._id, resources[10]._id], // FE-03, POL-01
    primaryReporterId: operatorUser._id,
    aiSummary: 'Situation Briefing: Highway multi-vehicle collision with moderate fuel containment risk. Police unit on scene establishing safety perimeter. Fire Ladder 03 en route.',
    responseMetrics: {
      detectionTimestamp: new Date(now.getTime() - 15 * 60000),
      dispatchedTimestamp: new Date(now.getTime() - 9 * 60000),
      dispatchDelayMinutes: 6,
    },
  });

  const incident3 = await Incident.create({
    incidentNumber: 'INC-2026-1044',
    title: 'High-Rise Construction Scaffolding Partial Collapse',
    description: 'Suspended construction scaffold detached from exterior of 18-story commercial tower. Hanging over pedestrian concourse. Immediate evacuation required.',
    type: 'BUILDING_COLLAPSE',
    severity: 'CRITICAL',
    priority: 'P1',
    status: 'ACTIVE',
    location: {
      address: '220 Market Plaza',
      zone: 'Sector 1 - Downtown',
      coordinates: [-122.4185, 37.7758],
    },
    casualtiesCount: 0,
    hazardLevel: 'STRUCTURAL_IMPACT',
    tags: ['STRUCTURAL_COLLAPSE', 'PEDESTRIAN_HAZARD', 'UNASSIGNED'],
    assignedResources: [],
    primaryReporterId: operatorUser._id,
    aiSummary: 'Situation Briefing: Critical collapse hazard above primary pedestrian thoroughfare. Unassigned emergency call. Urgent requirement for Heavy Rescue Squad 01.',
    responseMetrics: {
      detectionTimestamp: new Date(now.getTime() - 4 * 60000),
    },
  });

  const incident4 = await Incident.create({
    incidentNumber: 'INC-2026-1045',
    title: 'Mass Transit Subway Station Medical Cardiac Emergency',
    description: 'Commuter suffered sudden cardiac arrest on outbound platform. Bystander CPR initiated. Automated external defibrillator (AED) on-site deployed.',
    type: 'MEDICAL',
    severity: 'HIGH',
    priority: 'P1',
    status: 'EN_ROUTE',
    location: {
      address: 'Central Subway Station Concourse',
      zone: 'Sector 5 - Transit Hub',
      coordinates: [-122.4118, 37.7842],
    },
    casualtiesCount: 1,
    hazardLevel: 'BIO_MEDICAL',
    tags: ['CARDIAC_ARREST', 'PUBLIC_TRANSIT', 'CPR_IN_PROGRESS'],
    assignedResources: [resources[4]._id], // ALS-05
    primaryReporterId: operatorUser._id,
    aiSummary: 'Situation Briefing: Critical life-safety incident. ALS-05 paramedic crew en route with estimated arrival in 3 minutes.',
    responseMetrics: {
      detectionTimestamp: new Date(now.getTime() - 8 * 60000),
      dispatchedTimestamp: new Date(now.getTime() - 6 * 60000),
      dispatchDelayMinutes: 2,
    },
  });

  const incident5 = await Incident.create({
    incidentNumber: 'INC-2026-1046',
    title: 'Residential Multi-Family Electrical Fire',
    description: 'Kitchen electrical short fire spreading to attic space in 3-story residential complex. Occupants safely evacuating into courtyard.',
    type: 'FIRE',
    severity: 'MEDIUM',
    priority: 'P3',
    status: 'ON_SCENE',
    location: {
      address: '1420 Pinecrest Terrace',
      zone: 'Sector 4 - Residential North',
      coordinates: [-122.4295, 37.7942],
    },
    casualtiesCount: 0,
    hazardLevel: 'STANDARD_SMOKE',
    tags: ['RESIDENTIAL_FIRE', 'EVACUATION_COMPLETE'],
    assignedResources: [resources[5]._id], // FE-01
    primaryReporterId: operatorUser._id,
    aiSummary: 'Situation Briefing: Contained residential structure fire. Occupants evacuated with no injuries reported. Initial knock-down underway.',
    responseMetrics: {
      detectionTimestamp: new Date(now.getTime() - 35 * 60000),
      dispatchedTimestamp: new Date(now.getTime() - 31 * 60000),
      arrivedTimestamp: new Date(now.getTime() - 22 * 60000),
      dispatchDelayMinutes: 4,
      totalResponseMinutes: 9,
    },
  });

  const incident6 = await Incident.create({
    incidentNumber: 'INC-2026-1047',
    title: 'Subterranean Water Main Rupture & Urban Flash Flooding',
    description: '24-inch water transmission main rupture causing street flooding up to 1.5 feet depth. Basement parking garage ingress observed.',
    type: 'FLOOD',
    severity: 'LOW',
    priority: 'P4',
    status: 'RESOLVED',
    location: {
      address: '5th & Folsom Boulevard',
      zone: 'Sector 1 - Downtown',
      coordinates: [-122.414, 37.773],
    },
    casualtiesCount: 0,
    hazardLevel: 'LOW_UTILITY',
    tags: ['WATER_MAIN', 'STREET_FLOODING', 'UTILITY_SHUTOFF'],
    assignedResources: [],
    primaryReporterId: operatorUser._id,
    aiSummary: 'Situation Briefing: Municipal utility isolation complete. Roadway cleared and incident marked resolved.',
    responseMetrics: {
      detectionTimestamp: new Date(now.getTime() - 120 * 60000),
      dispatchedTimestamp: new Date(now.getTime() - 110 * 60000),
      arrivedTimestamp: new Date(now.getTime() - 95 * 60000),
      resolvedTimestamp: new Date(now.getTime() - 20 * 60000),
      dispatchDelayMinutes: 10,
      totalResponseMinutes: 15,
    },
  });

  // 6. Seed Citizen/Operator Reports
  console.log('[Seed] Linking synthetic incident reports...');
  await Report.create([
    {
      reportNumber: 'REP-2026-8001',
      source: 'CITIZEN',
      rawText: 'Black acrid smoke pouring out of warehouse windows on Industrial Way. Sparks flying, I see workers coughing near the loading docks!',
      callerInfo: { name: 'David Miller', phone: '555-0182', locationDescription: 'Across from Rail Depot' },
      verified: true,
      incidentRef: incident1._id,
    },
    {
      reportNumber: 'REP-2026-8002',
      source: 'SENSOR',
      rawText: 'Automated Alarm: Industrial Sensor SENS-IND-301 tripped CRITICAL smoke obscuration 94.2% at Zone 3.',
      verified: true,
      incidentRef: incident1._id,
    },
    {
      reportNumber: 'REP-2026-8003',
      source: 'OPERATOR_CALL',
      rawText: 'Highway patrol dispatch confirming tanker truck collision with passenger sedan. Fuel tank punctured.',
      callerInfo: { name: 'Dispatch Desk 4', phone: '555-9110' },
      verified: true,
      incidentRef: incident2._id,
    },
    {
      reportNumber: 'REP-2026-8004',
      source: 'CITIZEN',
      rawText: 'The big metal scaffold at the new tower construction site just snapped! Cables are swaying right over the sidewalk!',
      callerInfo: { name: 'Sarah Chen', phone: '555-0144' },
      verified: true,
      incidentRef: incident3._id,
    },
  ]);

  // 7. Seed Operator Audit Trail Entries
  console.log('[Seed] Generating operator audit trail...');
  await IncidentUpdate.create([
    {
      incidentId: incident1._id,
      actorId: operatorUser._id,
      actorName: operatorUser.name,
      actorRole: operatorUser.role,
      action: 'ACKNOWLEDGE',
      summary: 'Incident acknowledged and opened in primary coordination queue.',
      timestamp: new Date(now.getTime() - 23 * 60000),
    },
    {
      incidentId: incident1._id,
      actorId: supervisorUser._id,
      actorName: supervisorUser.name,
      actorRole: supervisorUser.role,
      action: 'CHANGE_SEVERITY',
      summary: 'Severity escalated to CRITICAL following confirmation of trapped workers and toxic fumes.',
      previousState: { severity: 'HIGH' },
      newState: { severity: 'CRITICAL' },
      reason: 'Confirmed multiple casualties trapped on second tier mezzanine.',
      timestamp: new Date(now.getTime() - 21 * 60000),
    },
    {
      incidentId: incident1._id,
      actorId: operatorUser._id,
      actorName: operatorUser.name,
      actorRole: operatorUser.role,
      action: 'ASSIGN_RESOURCE',
      summary: 'Dispatched Engine 02 and Hazmat Unit 01 to scene.',
      timestamp: new Date(now.getTime() - 12 * 60000),
    },
    {
      incidentId: incident1._id,
      actorId: supervisorUser._id,
      actorName: supervisorUser.name,
      actorRole: supervisorUser.role,
      action: 'ESCALATE',
      summary: 'Incident flagged as DELAYED: Ambulance unit delayed due to transit gridlock.',
      reason: 'Response threshold exceeded; regional mutual aid notified.',
      timestamp: new Date(now.getTime() - 6 * 60000),
    },
  ]);

  // 8. Seed Notifications
  console.log('[Seed] Generating operational alert notifications...');
  await Notification.create([
    {
      title: 'RESPONSE DELAY WARNING',
      message: 'Incident INC-2026-1042 (Chemical Fire) has exceeded the 10-minute ambulance dispatch window.',
      level: 'CRITICAL',
      type: 'DELAY_BREACH',
      relatedIncidentId: incident1._id,
      zone: 'Sector 3 - Industrial Corridor',
      acknowledged: false,
    },
    {
      title: 'CRITICAL UNASSIGNED INCIDENT',
      message: 'Scaffolding collapse hazard at 220 Market Plaza requires immediate rescue squad dispatch.',
      level: 'CRITICAL',
      type: 'HAZARD_ALERT',
      relatedIncidentId: incident3._id,
      zone: 'Sector 1 - Downtown',
      acknowledged: false,
    },
    {
      title: 'REGIONAL HOSPITAL DIVERSION',
      message: 'St. Jude Industrial Health Center has activated DIVERT status due to trauma bay saturation.',
      level: 'WARNING',
      type: 'RESOURCE_SHORTAGE',
      zone: 'Sector 3 - Industrial Corridor',
      acknowledged: false,
    },
  ]);

  console.log('===========================================================');
  console.log(' PS-9 Synthetic EOC Demo Data Seeding Completed Successfully! ');
  console.log('===========================================================');
  console.log('Seeded Accounts for Testing:');
  console.log(`- Operator:    operator@ps9.demo    (Password: ${env.DEMO_SEED_PASSWORD})`);
  console.log(`- Supervisor:  supervisor@ps9.demo  (Password: ${env.DEMO_SEED_PASSWORD})`);
  console.log(`- Field Team:  field@ps9.demo       (Password: ${env.DEMO_SEED_PASSWORD})`);
  console.log(`- Admin:       admin@ps9.demo       (Password: ${env.DEMO_SEED_PASSWORD})`);
  console.log('===========================================================');

  await mongoose.disconnect();
};

runSeed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
