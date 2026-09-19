# PS-9 — Intelligent Emergency Response & Resource Coordination Platform
# Updated 5-Phase Major Project Plan

## 1. Product Vision

Build a **professional AI-assisted Emergency Command & Coordination Center**, not a basic CRUD dashboard.

The MVP must provide emergency operators with a clear operational picture:

- What emergencies are active?
- Where are they?
- Which ones are critical?
- What is getting worse?
- Which teams/resources are available?
- Which resources are assigned?
- Which responses are delayed?
- Which incidents require escalation?
- What areas are repeatedly affected?
- Where are resource shortages?
- What has changed recently?
- What does the AI understand about the current situation?
- What action should the operator consider next?

The dashboard is the primary product surface and must be designed as an **operations/control-room interface**.

---

# 2. Core Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.IO Client
- Leaflet
- React-Leaflet
- Recharts
- Lucide React
- shadcn/ui / Radix UI
- date-fns

## Backend

- Node.js
- Express.js
- TypeScript
- Mongoose
- Socket.IO
- Redis
- BullMQ
- Zod
- JWT
- bcrypt
- Helmet
- Pino / Pino HTTP
- Multer
- Nodemailer

## AI

- Google Gemini API
- `@google/genai`
- Gemini text generation
- Gemini embeddings
- Rule-based severity scoring
- Deterministic resource recommendation
- Gemini summaries and explanations
- Gemini command-center assistant

## Database

- MongoDB
- Redis

## Maps

- OpenStreetMap
- Leaflet
- React-Leaflet

## Deployment

- Docker
- GitHub
- Vercel
- Render / Railway
- MongoDB Atlas
- Redis Cloud

---

# 3. Architecture

```text
                    ┌───────────────────────┐
                    │     React Frontend    │
                    │  Emergency Command UI │
                    └───────────┬───────────┘
                                │
                    REST + Socket.IO
                                │
                                ↓
                    ┌───────────────────────┐
                    │    Node.js Backend    │
                    │ Express + TypeScript  │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          ↓                     ↓                      ↓
      MongoDB                 Redis               Gemini API
          │                     │                      │
          │                BullMQ Jobs         ┌───────┼────────┐
          │                     │              ↓       ↓        ↓
          │                     │          Analysis Embedding Summary
          └─────────────────────┼──────────────────────────────┘
                                ↓
                    Business / Decision Engine
                                ↓
                 Resource + Response Coordination
                                ↓
                         Socket.IO Events
                                ↓
                       Live Command Dashboard
```

---

# 4. Five-Phase Strategy

The project will be completed in exactly five major phases:

```text
PHASE 1
Foundation + Design System + Core Data
        ↓
PHASE 2
Incident Collection + Operational Dashboard
        ↓
PHASE 3
AI Intelligence + Resource Coordination
        ↓
PHASE 4
Real-Time Operations + Alerts + Advanced Dashboard
        ↓
PHASE 5
Analytics + UX Polish + Testing + Deployment + Demo
```

---

# PHASE 1 — Foundation, Architecture & Professional UI System

## Goal

Create the technical foundation and establish a **professional emergency-command UI system before implementing advanced features**.

Do not build a plain dashboard and plan to redesign it later.

---

## 1.1 Repository Setup

```text
ps9-emergency-platform/
│
├── frontend/
├── backend/
├── docs/
├── scripts/
├── docker-compose.yml
└── README.md
```

---

## 1.2 Frontend Architecture

Recommended:

```text
frontend/src/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── incidents/
│   ├── resources/
│   ├── map/
│   ├── charts/
│   ├── alerts/
│   └── ai/
│
├── pages/
│   ├── Dashboard/
│   ├── Incidents/
│   ├── Resources/
│   ├── Teams/
│   ├── Analytics/
│   ├── Alerts/
│   └── Settings/
│
├── layouts/
├── hooks/
├── services/
├── store/
├── types/
├── utils/
└── App.tsx
```

---

# 1.3 Professional UI Design System

Create reusable design tokens for:

### Severity

```text
Critical
High
Medium
Low
```

### Status

```text
Active
Under Review
Assigned
En Route
On Scene
Resolved
Escalated
Delayed
```

### UI components

Build reusable:

- Stat cards
- Incident cards
- Resource cards
- Status badges
- Severity badges
- Alert banners
- Data tables
- Tabs
- Modals
- Drawers
- Tooltips
- Filters
- Search bars
- Pagination
- Empty states
- Loading skeletons
- Toast notifications
- Confirmation dialogs
- AI response panels

---

# 1.4 Command-Center Layout

The main dashboard should follow an information hierarchy.

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: System Status | Time | Notifications | User          │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Sidebar      │ Command Center                                │
│              │                                               │
│ Dashboard    │ ┌──────┬──────┬──────┬──────┬─────────────┐  │
│ Incidents    │ │Active│Crit. │High  │Delay │Resources    │  │
│ Resources    │ └──────┴──────┴──────┴──────┴─────────────┘  │
│ Teams        │                                               │
│ Map          │ ┌──────────────────────┬───────────────────┐  │
│ Analytics    │ │                      │ Critical Alerts   │  │
│ Alerts       │ │      LIVE MAP        │                  │  │
│ AI Assistant │ │                      │ Incident Feed    │  │
│              │ └──────────────────────┴───────────────────┘  │
│              │                                               │
│              │ ┌──────────────────┬────────────────────────┐ │
│              │ │ Incident Trends  │ Resource Availability  │ │
│              │ └──────────────────┴────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────┘
```

The exact layout can evolve, but the dashboard must remain information-dense without becoming visually chaotic.

---

# 1.5 Dashboard Must-Have Sections

The MVP dashboard should include:

### A. KPI / Situation Cards

At minimum:

```text
Active Incidents
Critical Incidents
High Priority Incidents
Delayed Responses
Available Resources
Resources in Use
Escalated Incidents
Average Response Time
```

Each card should include:

- Current value
- Comparison with previous period where meaningful
- Small trend indicator
- Click-through behavior where useful

---

### B. Live Emergency Map

The map is a core operational component, not decoration.

Show:

```text
🔴 Critical incidents
🟠 High incidents
🟡 Medium incidents
🟢 Low incidents

🚑 Ambulances
🚒 Fire trucks
👮 Response teams
🏥 Hospitals
```

Features:

- Marker clustering where needed
- Incident popup
- Resource popup
- Severity legend
- Map filters
- Search by area
- Recenter
- Selected incident highlighting
- Optional heatmap layer
- Optional route display

---

### C. Critical Alerts Panel

Show the highest-priority operational alerts.

Example:

```text
CRITICAL
Industrial fire — 4 min without assignment

HIGH
Flood zone expanding

DELAYED
Ambulance response exceeded threshold

ESCALATED
Incident #1042 escalated to supervisor
```

Every alert should be clickable.

---

### D. Live Incident Feed

Show recent events:

```text
12:43
New fire report received

12:44
3 reports consolidated

12:45
Incident upgraded to Critical

12:46
Fire Team A assigned

12:48
Team A arrived on scene
```

Use timestamps and source labels.

---

### E. Charts

At minimum:

1. Incidents by type
2. Incidents by severity
3. Incident trend over time
4. Average response time
5. Resource utilization
6. Delayed responses
7. Incidents by area

Charts must answer operational questions rather than exist only for visual appeal.

---

### F. Resource Availability

Example:

```text
AMBULANCE
Available: 8
Busy: 12
Unavailable: 2

FIRE TEAMS
Available: 4
Busy: 7

RESCUE TEAMS
Available: 3
Busy: 5
```

Use visual indicators and click-through to resource management.

---

### G. AI Situation Summary

A dedicated panel:

```text
AI SITUATION SUMMARY

Current situation:
4 critical incidents are active.

Main concern:
Industrial fire in Zone 3 has confirmed injuries
and a delayed response.

Resource concern:
Ambulance availability is below the configured
threshold in Zone 3.

Suggested operator attention:
Review Incident #1042 and the ambulance shortage.
```

The AI should summarize system data, not invent facts.

---

# 1.6 Authentication

Implement:

- Login
- JWT
- Role-based access

Roles:

```text
ADMIN
CONTROL_ROOM
OPERATOR
FIELD_TEAM
HOSPITAL
```

---

# 1.7 Database

Create:

```text
User
Incident
Report
Resource
Team
Vehicle
Hospital
Sensor
IncidentUpdate
Notification
```

---

# 1.8 Phase 1 Deliverable

The phase is complete when:

- Backend works
- MongoDB works
- Authentication works
- Base UI is professionally designed
- Dashboard layout is implemented
- Reusable design system exists
- Basic incident/resource data can be displayed
- Navigation works
- Responsive behavior is implemented
- No raw/default-looking dashboard remains

---

# PHASE 2 — Incident Collection + Operational Dashboard

## Goal

Connect real data flows to the dashboard and make the command center operational.

---

## 2.1 Citizen Reports

Build:

```text
Report Emergency
```

Fields:

```text
Type
Description
Location
People affected
Image
Timestamp
```

---

## 2.2 Operator / Emergency Call Entry

Control-room operators can manually create incidents.

---

## 2.3 Sensor Simulator

Simulate:

```text
Smoke
Temperature
Water level
Industrial hazard
```

---

## 2.4 Field Team Updates

Field teams can submit:

```text
Location
Observation
Status
People affected
Current condition
```

---

## 2.5 Data Normalization

Convert all inputs into:

```text
source
type
description
location
timestamp
metadata
```

---

## 2.6 Incident Classification

Use Gemini to understand natural language.

Possible categories:

```text
FIRE
FLOOD
ROAD_ACCIDENT
MEDICAL
INDUSTRIAL_ACCIDENT
BUILDING_COLLAPSE
EARTHQUAKE
OTHER
```

---

## 2.7 Severity

Use deterministic scoring.

Example factors:

```text
Explosion
Casualties
Fire spreading
Industrial location
Population exposure
Road blockage
Infrastructure damage
```

Levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

## 2.8 Incident Management Screen

Build a proper incident management page.

Features:

- Search
- Filters
- Severity filter
- Type filter
- Status filter
- Source filter
- Date/time filter
- Location filter
- Sort
- Pagination
- Table/list toggle

Incident details should open into a detailed page or drawer.

---

## 2.9 Incident Detail Page

Include:

```text
Incident header
Severity
Priority
Status
Location
Map
Description
AI summary
Related reports
Sensor data
Timeline
Assigned resources
Field team updates
Response metrics
Alerts
Audit history
```

This page is one of the most important operational screens.

---

## 2.10 Phase 2 Deliverable

The phase is complete when:

```text
Citizen
Operator
Sensor
Field Team
      ↓
Incident Pipeline
      ↓
Dashboard
      ↓
Incident Detail
```

works end-to-end.

---

# PHASE 3 — AI Intelligence + Duplicate Detection + Resource Coordination

## Goal

Make the platform intelligent rather than simply informational.

---

# 3.1 Gemini Integration

Use:

```text
@google/genai
```

Environment:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_EMBEDDING_MODEL=
```

Never expose the key to React.

---

# 3.2 AI Incident Understanding

Gemini extracts:

```text
Incident type
Hazards
Potential casualties
Relevant entities
Required resource categories
Important facts
```

Validate the output with Zod.

---

# 3.3 AI Emergency Summary

Combine:

```text
Reports
Sensor events
Field updates
Incident metadata
```

Generate:

```text
Current situation
Confirmed facts
Unknown information
Main risks
```

Never invent missing information.

---

# 3.4 Duplicate Detection

Use:

```text
Gemini embeddings
+
Location similarity
+
Time similarity
+
Incident type
```

Example:

```text
20 reports
   ↓
8 possible duplicates
   ↓
1 master incident
   ↓
12 unique supporting reports
```

---

# 3.5 Master Incident

Master incident should show:

```text
Number of reports
Sources
Severity
Priority
Confirmed facts
AI summary
Latest update
Assigned resources
```

---

# 3.6 Resource Recommendation Engine

Use deterministic backend logic.

Input:

```text
Incident requirements
Resource availability
Resource capabilities
Resource capacity
Distance
Current assignment
```

Output:

```text
Ranked resources
```

Example:

```text
1. Fire Team A
   Score: 93
   Distance: 2.1 km
   Available
   Suitable capability

2. Fire Team B
   Score: 78
   Distance: 5.4 km
   Available
```

---

# 3.7 Recommendation Explanation

Gemini can explain:

```text
Fire Team A is recommended because it is the
nearest available team with the required capability.
```

But the recommendation itself must come from backend logic.

---

# 3.8 Resource Management Screen

Build a proper resource page.

Include:

```text
Total resources
Available
Busy
En Route
Unavailable
Resource shortages
```

Filters:

```text
Type
Status
Area
Capability
```

Resource detail:

```text
Current location
Status
Capabilities
Capacity
Current assignment
Recent history
```

---

# 3.9 AI Command Assistant

Build a dedicated assistant panel.

The operator can ask:

```text
What are the critical incidents?

Why is Incident #1042 critical?

Which resources are available near Zone 3?

What responses are delayed?

Summarize the current situation.
```

Backend retrieves relevant live data and sends only the necessary context to Gemini.

---

# 3.10 Phase 3 Deliverable

The phase is complete when:

- Gemini works
- AI extraction works
- AI summaries work
- Embedding-based duplicate detection works
- Master incidents work
- Resource recommendation works
- Resource explanations work
- AI command assistant works
- Resource management UI works

---

# PHASE 4 — Real-Time Operations + Alerts + Advanced Command Dashboard

## Goal

Turn the platform into a live emergency operations center.

---

# 4.1 Socket.IO

Implement:

```text
incident.created
incident.updated
incident.severityChanged
resource.assigned
resource.statusChanged
team.locationUpdated
incident.escalated
notification.created
```

---

# 4.2 Live Dashboard Updates

No manual refresh should be required for operational events.

Example:

```text
Sensor alert
   ↓
Incident created
   ↓
Socket.IO
   ↓
Dashboard instantly updates
```

---

# 4.3 Real-Time Map

The map should update:

- Incident status
- Resource status
- Team position
- Severity
- Selected incident
- Alerts

---

# 4.4 Response Coordination

Operator workflow:

```text
Incident
   ↓
AI analysis
   ↓
Resource recommendations
   ↓
Operator review
   ↓
Approve
   ↓
Assign
   ↓
Track
```

---

# 4.5 Response Timeline

Every incident should have a timeline:

```text
12:01 Report received
12:02 Incident created
12:02 Classified Critical
12:03 Resource recommended
12:04 Resource assigned
12:06 Team en route
12:11 Team arrived
12:28 Incident resolved
```

---

# 4.6 Response Metrics

Calculate:

```text
Detection time
Assignment time
Dispatch delay
Travel/arrival time
Total response time
Resolution time
```

These metrics feed the analytics dashboard.

---

# 4.7 Delayed Response Detection

Use BullMQ + Redis.

Example:

```text
Critical incident
      ↓
No assignment within threshold
      ↓
DELAY ALERT
      ↓
Operator notification
      ↓
Escalation if unresolved
```

---

# 4.8 Escalation Center

Create a dedicated alert/escalation panel.

Include:

```text
Critical
Delayed
Escalated
Resource shortage
System warning
```

Actions:

```text
Review
Assign
Reassign
Escalate
Acknowledge
Resolve
```

---

# 4.9 Advanced Dashboard Sections

At this phase, the main dashboard should include:

```text
1. KPI cards
2. Live map
3. Critical alert queue
4. Live incident feed
5. AI situation summary
6. Incident trend chart
7. Severity distribution chart
8. Resource utilization chart
9. Response-time chart
10. Resource availability
11. Delayed-response panel
12. Geographic/heatmap view
```

---

# 4.10 Phase 4 Deliverable

The command center should now feel like a live operations system rather than a normal web dashboard.

---

# PHASE 5 — Analytics + UX Polish + Testing + Deployment + Hackathon Demo

## Goal

Make the platform polished, reliable, visually strong, and presentation-ready.

---

# 5.1 Analytics Dashboard

Create a dedicated analytics page.

---

## A. Incident Trends

Chart:

```text
Incidents per hour/day/week
```

Allow filters:

```text
Date range
Incident type
Severity
Location
```

---

## B. Incident Type Distribution

Use:

- Bar chart
- Donut/pie chart where appropriate

Example:

```text
Fire           35%
Road Accident  25%
Flood          18%
Medical        15%
Other           7%
```

---

## C. Severity Distribution

Show:

```text
Critical
High
Medium
Low
```

---

## D. Response Time Analytics

Show:

```text
Average response time
Median response time
Fastest response
Slowest response
Delayed response percentage
```

Use:

- Line chart
- Bar chart
- KPI cards

---

## E. Resource Utilization

Show:

```text
Available
Busy
En Route
Unavailable
```

Break down by resource type.

---

## F. Resource Shortage Analytics

Example:

```text
Zone 3

Required ambulances: 8
Available: 4
Shortage: 4
```

Show shortage trends over time.

---

## G. Geographic Analytics

Create:

```text
Incident heatmap
High-risk zones
Incident clusters
Frequently affected areas
```

---

# 5.2 Operational Insights

Create an AI-generated insights section.

Example:

```text
AI OPERATIONAL INSIGHTS

• Zone 3 has experienced the highest incident volume
  during the selected period.

• Ambulance availability is consistently low in Zone 3.

• Average response time increased during the evening
  period.

• Industrial incidents account for a significant share
  of critical cases.
```

Every insight must be based on actual data.

---

# 5.3 Advanced Filters

Global filters should include:

```text
Date
Time range
Incident type
Severity
Status
Source
Zone
Resource type
```

Filters should update:

- KPIs
- Charts
- Map
- Incident lists
- Analytics

---

# 5.4 UX Polish

Add:

- Loading skeletons
- Empty states
- Error states
- Toast notifications
- Confirmation dialogs
- Smooth transitions
- Tooltips
- Responsive layout
- Keyboard accessibility
- Clear typography
- Consistent spacing
- Consistent iconography

Avoid unnecessary animations.

Emergency interfaces should prioritize clarity over visual effects.

---

# 5.5 Responsive Design

The main command center is desktop-first.

Still support:

```text
Desktop
Laptop
Tablet
```

The mobile experience can focus on:

```text
Alerts
Incident details
Resource status
AI assistant
```

---

# 5.6 Accessibility

Check:

- Color contrast
- Keyboard navigation
- Labels
- Focus states
- Tooltip clarity
- Icon + text combinations
- Do not rely on color alone for severity

Example:

Instead of only:

```text
🔴
```

use:

```text
🔴 CRITICAL
```

---

# 5.7 Testing

Test:

### Backend

```text
Authentication
Authorization
Incident APIs
Resource APIs
Duplicate detection
Severity calculation
Recommendation engine
AI failure
Database failure
```

### Frontend

```text
Dashboard
Filters
Charts
Map
Incident details
Forms
Notifications
AI assistant
```

### Integration

Test:

```text
Incident → AI → Duplicate detection → Resource recommendation
→ Assignment → Real-time update → Resolution → Analytics
```

---

# 5.8 Failure Testing

Simulate:

```text
Gemini unavailable
MongoDB unavailable
Redis unavailable
Socket disconnected
Invalid input
Duplicate reports
No resources available
Resource becomes unavailable after recommendation
Delayed response
```

The application should fail gracefully.

---

# 5.9 Performance

Avoid:

```text
Repeated Gemini calls
Huge prompts
Huge database queries
Unnecessary Socket broadcasts
Repeated map rendering
```

Use:

```text
Pagination
Caching
Debouncing
Memoization
Selective AI calls
Indexed database queries
```

---

# 5.10 Security

Review:

```text
JWT
RBAC
Helmet
CORS
Rate limiting
Zod validation
File validation
Secret management
API key protection
```

---

# 5.11 Deployment

```text
React → Vercel
Node.js → Render / Railway
MongoDB → MongoDB Atlas
Redis → Redis Cloud
Gemini → Google Gemini API
```

Use Docker where useful.

---

# 5.12 Hackathon Demo Scenario

Prepare one polished scenario.

## Step 1 — Citizen report

```text
"Large fire near ABC industrial area.
Heavy smoke and people trapped."
```

## Step 2 — Sensor alert

```text
Smoke: 92%
Temperature: 104°C
```

## Step 3 — Additional reports

Several reports arrive describing the same location.

## Step 4 — AI

```text
Type: Industrial Fire
Severity: Critical
Priority: P1
```

## Step 5 — Duplicate detection

```text
8 reports
     ↓
1 master incident
```

## Step 6 — Dashboard

The dashboard instantly shows:

```text
Critical incident
Map marker
Alert
Incident feed
KPI update
```

## Step 7 — Resource recommendation

```text
Fire Team A
Fire Truck 03
Ambulance 07
```

## Step 8 — Operator approval

Operator approves the assignment.

## Step 9 — Live tracking

```text
ASSIGNED
↓
EN_ROUTE
↓
ON_SCENE
```

## Step 10 — Delay scenario

Simulate a delayed ambulance.

Dashboard:

```text
⚠ RESPONSE DELAY
```

## Step 11 — Escalation

Incident escalates.

## Step 12 — Resolution

Team arrives and incident is resolved.

## Step 13 — Analytics

Charts update:

```text
Response time
Incident count
Resource utilization
Severity
```

---

# 6. Dashboard Page Map

The final frontend should contain:

```text
/login

/dashboard

/incidents
/incidents/:id

/resources
/resources/:id

/teams

/map

/alerts

/analytics

/ai-assistant

/settings
```

---

# 7. Dashboard Information Architecture

## Dashboard

Purpose:

> "Tell the operator what needs attention right now."

Include:

```text
KPI row
Live map
Critical alerts
Active incident queue
AI situation summary
Resource availability
Response-time trend
Incident trend
```

## Incidents

Purpose:

> "Find and investigate incidents."

Include:

```text
Search
Filters
Table/list
Severity
Status
Source
Location
Created time
Response time
```

## Incident Details

Purpose:

> "Understand one emergency completely."

Include:

```text
Summary
Map
Timeline
Reports
Sensors
AI summary
Resources
Team updates
Alerts
Metrics
Audit trail
```

## Resources

Purpose:

> "Understand current response capacity."

Include:

```text
Availability
Map
Status
Capability
Capacity
Assignments
Shortages
```

## Alerts

Purpose:

> "Handle situations requiring attention."

Include:

```text
Critical
Delayed
Escalated
Acknowledged
Resolved
```

## Analytics

Purpose:

> "Understand historical performance and patterns."

Include:

```text
Trends
Severity
Types
Response time
Resource utilization
Shortages
Geography
AI insights
```

## AI Assistant

Purpose:

> "Ask questions about the current emergency situation."

---

# 8. UI Design Principles

## Principle 1 — Operational clarity

The user should understand the situation within seconds.

## Principle 2 — Critical information first

Critical incidents and delays must be visually prominent.

## Principle 3 — Map + data together

The map provides geographic context while charts/tables provide analytical context.

## Principle 4 — No chart without purpose

Every chart should answer a question.

## Principle 5 — Consistent severity language

Always use:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

## Principle 6 — Explain AI decisions

Show:

```text
Why critical?
Why this resource?
Why duplicate?
```

## Principle 7 — Human control

Operators should be able to review and override recommendations.

---

# 9. P0 / P1 / P2 Scope

## P0 — Must Have

```text
Professional dashboard UI
KPI cards
Live map
Critical alerts
Incident management
Incident detail page
Incident collection
Classification
Severity
Duplicate detection
Resource recommendation
Resource management
Socket.IO
Real-time status
Core charts
```

## P1 — Important

```text
AI summaries
AI assistant
Advanced analytics
Response-time analytics
Resource utilization
Escalation
Heatmap
Resource shortage detection
Operational insights
```

## P2 — Bonus

```text
SMS
Voice input
Image analysis
Advanced route optimization
Predictive analytics
Mobile app
Advanced forecasting
```

Do not start P2 until P0 is stable.

---

# 10. Final Definition of Done

The project is complete when:

```text
Multiple sources send incidents
          ↓
Node.js receives them
          ↓
Gemini understands unstructured information
          ↓
Severity is calculated
          ↓
Duplicate reports are consolidated
          ↓
Master incident is created
          ↓
Resources are filtered and ranked
          ↓
Operator reviews recommendation
          ↓
Resource is assigned
          ↓
Live dashboard updates
          ↓
Team is tracked
          ↓
Delayed response is detected
          ↓
Incident can be escalated
          ↓
Incident is resolved
          ↓
Analytics update
          ↓
AI summarizes operational situation
```

The finished product should look and behave like a **professional emergency command center**, not a normal admin panel.
