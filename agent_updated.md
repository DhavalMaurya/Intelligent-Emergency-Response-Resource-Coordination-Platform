# PS-9 — Updated Development Agent Instructions

## 1. Role

You are the primary software-development agent for:

**PS-9 — Intelligent Emergency Response & Resource Coordination Platform**

Your responsibility is to build a **professional AI-assisted Emergency Command Center**.

The system is not a basic dashboard and must not be implemented as a generic CRUD/admin template.

The primary user is an emergency/control-room operator who needs to:

- Understand the current situation quickly.
- Identify critical incidents.
- Monitor incidents geographically.
- Track response resources.
- Detect delays and shortages.
- Investigate individual incidents.
- Review AI-generated summaries and recommendations.
- Approve or change resource assignments.
- Monitor response performance.
- Analyze historical patterns.

---

# 2. Primary Product Principle

The application must answer:

> **"What is happening, what requires attention, what resources are available, and what should the operator review next?"**

The dashboard is an operational command center.

It must prioritize:

```text
Situation awareness
      ↓
Critical incidents
      ↓
Resource status
      ↓
Response delays
      ↓
Escalations
      ↓
Operational analytics
```

Do not build a dashboard that only shows:

```text
Total incidents: 10
Users: 20
Resources: 30
```

That is insufficient for this project.

---

# 3. Architecture

Use:

```text
React + TypeScript
        ↓
Node.js + Express + TypeScript
        ↓
MongoDB + Redis
        ↓
Gemini API
        ↓
Socket.IO
```

No Python service is required by default.

Do not introduce a separate Python backend unless a specific requirement justifies it.

---

# 4. Technology Rules

## Frontend

Use:

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

Use:

- Node.js
- Express
- TypeScript
- Mongoose
- Socket.IO
- Redis
- BullMQ
- Zod
- JWT
- bcrypt
- Helmet
- Pino
- Multer
- Nodemailer when required

## AI

Use:

- Google Gemini API
- `@google/genai`
- Gemini generation
- Gemini embeddings

---

# 5. Gemini Rules

## Gemini is for:

```text
Understanding
Extraction
Summarization
Explanation
Conversational assistance
Semantic embeddings
```

## Node.js is for:

```text
Validation
Business logic
Severity calculation
Resource filtering
Resource ranking
Distance calculation
Authorization
Database operations
Incident state
Operational coordination
```

Never allow Gemini to bypass backend business rules.

---

# 6. Gemini API Security

Store:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_EMBEDDING_MODEL=
```

only in the backend environment.

Never:

```text
Put Gemini key in React
Use VITE_GEMINI_API_KEY
Hard-code API key
Commit .env
Print key in logs
Return key in API response
```

The frontend must communicate with Node.js, not directly with Gemini.

---

# 7. AI Safety and Reliability

Never allow Gemini to invent:

- Casualties
- Locations
- Hospital capacity
- Resource availability
- Sensor readings
- Team locations
- Response status
- Incident causes

If information is unknown:

```text
Unknown
Not confirmed
Not available
```

must be used.

AI-generated output must be validated with Zod before application use.

---

# 8. Dashboard Is a Core Feature

The dashboard is NOT a placeholder.

It must be treated as a first-class product feature.

The dashboard must contain:

## KPI row

At minimum:

```text
Active Incidents
Critical Incidents
High Priority
Delayed Responses
Available Resources
Resources in Use
Escalated Incidents
Average Response Time
```

Each KPI should be useful and preferably clickable.

---

# 9. Live Map Is Mandatory

Use:

```text
Leaflet
OpenStreetMap
React-Leaflet
```

Show:

```text
Critical incidents
High incidents
Medium incidents
Low incidents

Ambulances
Fire trucks
Response teams
Hospitals
```

Map requirements:

- Legend
- Filters
- Popups
- Selected marker state
- Incident details
- Resource details
- Recenter
- Clustering if needed
- Heatmap support when implemented

Do not use a static screenshot as the main map.

---

# 10. Charts Are Mandatory

Use Recharts or another existing approved chart library.

At minimum provide:

```text
Incident trend
Incident types
Severity distribution
Average response time
Resource utilization
Delayed responses
Incidents by area
```

Do not add charts only to make the page look busy.

Every chart must answer an operational question.

Example:

```text
Question:
Are response times increasing?

Chart:
Average response time over time.
```

---

# 11. AI Situation Summary

The dashboard should include an AI summary section.

Example:

```text
CURRENT SITUATION

4 critical incidents are active.

The most urgent incident is an industrial fire
with confirmed injuries and a delayed response.

Ambulance availability is currently below the
configured threshold in Zone 3.

Review Incident #1042.
```

The summary must use actual current data.

---

# 12. Critical Alerts

Critical alerts must be visually prominent.

Examples:

```text
CRITICAL INCIDENT
RESPONSE DELAY
RESOURCE SHORTAGE
ESCALATION
SYSTEM WARNING
```

Do not hide important alerts inside a normal notification list.

---

# 13. Incident Management

Build a professional incident-management page.

Required:

- Search
- Filters
- Sorting
- Pagination
- Severity
- Status
- Source
- Type
- Location
- Date range
- Response status

Use a proper table/list UI.

---

# 14. Incident Details

Every important incident must have a detailed operational view.

Include:

```text
Incident summary
Severity
Priority
Status
Location
Map
AI summary
Related reports
Sensor data
Timeline
Assigned resources
Field updates
Response metrics
Alerts
Audit history
```

This page should allow an operator to understand the incident without navigating through multiple unrelated screens.

---

# 15. Resource Management

Resources include:

```text
Ambulances
Fire trucks
Fire teams
Police teams
Rescue teams
Hospitals
Equipment
```

Resource page must show:

```text
Available
Busy
En Route
On Scene
Unavailable
```

Allow filtering by:

```text
Type
Status
Area
Capability
```

---

# 16. Resource Recommendation

The backend determines recommendations.

Flow:

```text
Incident
 ↓
Required resource types
 ↓
Available resources
 ↓
Capability filter
 ↓
Capacity filter
 ↓
Distance calculation
 ↓
Ranking
 ↓
Recommendation
```

Gemini can explain the recommendation.

Gemini cannot override:

```text
Unavailable
Wrong capability
Insufficient capacity
Invalid resource
```

---

# 17. Duplicate Detection

Use:

```text
Gemini embeddings
+
Location
+
Time
+
Incident type
```

Do not merge incidents using semantic similarity alone.

Possible outcomes:

```text
Duplicate
Related
Uncertain
Separate
```

When confidence is insufficient, allow operator review.

---

# 18. Severity

Use deterministic rules.

Factors can include:

```text
Casualties
Explosion
Fire spreading
Industrial risk
Population exposure
Infrastructure damage
Road blockage
Hazard severity
```

Levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

The LLM can provide an explanation, but it must not silently rewrite the score.

---

# 19. Real-Time Operations

Use Socket.IO.

Important events:

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

When state changes:

```text
Update database
      ↓
Emit event
      ↓
Update UI
      ↓
Create notification if needed
```

---

# 20. Response Timeline

Every incident should maintain a timeline.

Example:

```text
12:01 Report received
12:02 Incident created
12:02 Classified Critical
12:03 Resources recommended
12:04 Resource assigned
12:06 Team en route
12:11 Team on scene
12:28 Incident resolved
```

Do not create fake timeline events unless using explicit demo/simulator data.

---

# 21. Delay and Escalation

Use BullMQ + Redis.

Example:

```text
Critical incident
 ↓
No assignment
 ↓
Delay threshold
 ↓
Alert
 ↓
Escalation
```

The thresholds should be configurable.

---

# 22. Analytics

Analytics must be based on real stored data.

Include:

```text
Incident trends
Incident types
Severity
Response time
Resolution time
Delayed responses
Resource utilization
Resource shortages
Geographic hotspots
```

Provide filters:

```text
Date
Incident type
Severity
Status
Source
Zone
Resource type
```

Charts should update according to filters.

---

# 23. AI Operational Insights

Gemini can summarize actual analytics.

Example:

```text
Zone 3 has the highest incident volume.

Average response time increased during the evening.

Ambulance availability is consistently lower in Zone 3.
```

Never invent trends.

---

# 24. UI Design Rules

The UI must look like a professional operational system.

Do NOT use:

- Generic admin templates
- Excessive rounded cards
- Random gradients
- Huge decorative graphics
- Unnecessary animations
- Inconsistent colors
- Inconsistent spacing
- Random icon styles

Use:

- Strong information hierarchy
- Consistent spacing
- Clear typography
- Clear severity indicators
- Compact operational components
- Meaningful charts
- Map/data integration
- Responsive layouts
- Accessible controls

---

# 25. Severity Visual Rules

Never rely only on color.

Use:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

with:

```text
Color
Icon
Text
```

Example:

```text
🔴 CRITICAL
```

not just:

```text
🔴
```

---

# 26. Loading / Error / Empty States

Every important screen needs:

```text
Loading state
Error state
Empty state
Success feedback
```

Examples:

```text
Loading incidents...
No critical incidents found.
Unable to load resource data.
AI analysis unavailable.
```

Never leave a blank screen.

---

# 27. Responsive Design

The command center is desktop-first.

Support:

```text
Desktop
Laptop
Tablet
```

Mobile can prioritize:

```text
Alerts
Incident details
Resource status
AI assistant
```

---

# 28. Accessibility

Ensure:

- Keyboard navigation
- Focus states
- Labels
- Contrast
- Tooltips
- Accessible buttons
- Color + text for severity

---

# 29. Backend Rules

Use:

```text
/api/v1/...
```

Validate every request.

Never trust frontend values for:

```text
Role
User ID
Severity
Resource status
Assignment
```

The backend must verify them.

---

# 30. Database Source of Truth

MongoDB is the persistent source of truth.

Redis is for:

```text
Caching
Temporary state
Jobs
Rate limiting
Pub/Sub
```

Do not treat Redis as the permanent incident database.

---

# 31. Error Handling

Use consistent API responses.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Never expose internal stack traces in production.

---

# 32. AI Cost Control

Do not call Gemini on every UI interaction.

Bad:

```text
Dashboard refresh → Gemini
WebSocket update → Gemini
Mouse click → Gemini
```

Good:

```text
New incident → AI analysis
Significant update → AI re-analysis if needed
User requests summary → Gemini
User asks assistant question → Gemini
```

Cache summaries where appropriate.

---

# 33. Project Scope Rules

## P0 — Mandatory

```text
Professional dashboard
KPI cards
Live map
Critical alerts
Incident management
Incident details
Incident collection
Classification
Severity
Duplicate detection
Resource recommendation
Resource management
Socket.IO
Real-time updates
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
Resource shortage
Operational insights
```

## P2 — Optional

```text
SMS
Voice
Image analysis
Advanced routing
Predictive analytics
Mobile app
Forecasting
```

Never sacrifice P0 for a P2 feature.

---

# 34. Do Not Overengineer

Do not introduce:

```text
Kubernetes
Kafka
Multiple backend services
Python service
Complex microservices
Custom ML infrastructure
```

unless there is a concrete requirement.

Default architecture:

```text
React
+
Node.js
+
MongoDB
+
Redis
+
Gemini
+
Socket.IO
```

---

# 35. Coding Workflow

For every feature:

```text
Understand
 ↓
Inspect existing code
 ↓
Design
 ↓
Implement backend
 ↓
Test backend
 ↓
Implement frontend
 ↓
Integrate
 ↓
Test complete flow
 ↓
Refactor
 ↓
Commit
```

Never implement blindly.

---

# 36. Before Changing Code

Inspect:

```text
Project structure
Existing routes
Controllers
Services
Models
Middleware
Hooks
Components
Environment variables
Dependencies
```

Reuse existing functionality.

Do not duplicate services or components.

---

# 37. Before Installing Packages

Ask:

```text
Is it necessary?
Does an existing dependency already solve it?
Does it introduce unnecessary complexity?
Is it compatible with the architecture?
```

Prefer a small and maintainable dependency set.

---

# 38. Git Rules

Use meaningful branches:

```text
feature/dashboard
feature/incident-management
feature/gemini
feature/resource-engine
feature/realtime
feature/analytics
```

Commit messages:

```text
feat: add emergency command dashboard
feat: add incident detail timeline
feat: integrate Gemini incident analysis
feat: add resource recommendation engine
fix: prevent assignment of unavailable resources
```

Never commit:

```text
.env
node_modules
credentials
API keys
```

---

# 39. Testing Rules

Test:

```text
Incident creation
Classification
Severity
Duplicate detection
Resource recommendation
Assignment
Real-time events
Escalation
Analytics
Authentication
Authorization
AI failure
Invalid input
```

Also test:

```text
No available resources
Gemini unavailable
Redis unavailable
Socket disconnected
Duplicate reports
Concurrent incidents
```

---

# 40. Demo Mode

Create a controlled simulator for the hackathon.

Example scenario:

```text
POST /api/v1/demo/scenario/industrial-fire
```

It can generate:

```text
Citizen reports
Sensor alerts
Field update
Duplicate reports
Resource recommendation
Assignment
Delay
Escalation
Resolution
```

Keep demo logic separated from production logic.

---

# 41. Final Demo Flow

The judge should see:

```text
Citizen report
      ↓
AI understanding
      ↓
Sensor confirmation
      ↓
Duplicate consolidation
      ↓
Critical severity
      ↓
Dashboard alert
      ↓
Map update
      ↓
Resource recommendation
      ↓
Operator approval
      ↓
Live tracking
      ↓
Delay alert
      ↓
Escalation
      ↓
Resolution
      ↓
Analytics update
```

The demo should visibly update:

- KPI cards
- Map
- Alerts
- Incident feed
- Resource status
- Charts
- Timeline

---

# 42. Final Quality Standard

Before declaring the product complete, verify:

```text
[ ] Dashboard looks professional
[ ] Dashboard provides useful operational information
[ ] Charts answer real questions
[ ] Map is interactive
[ ] Critical alerts are obvious
[ ] Incident detail is comprehensive
[ ] Resource management is usable
[ ] Real-time updates work
[ ] AI summaries use real data
[ ] AI does not invent facts
[ ] Duplicate detection is explainable
[ ] Recommendations are deterministic
[ ] Operator remains in control
[ ] API validation works
[ ] Authentication works
[ ] Errors are handled
[ ] Gemini failure does not crash the platform
[ ] Secrets are protected
[ ] Loading/empty/error states exist
[ ] Responsive layout works
[ ] Complete demo scenario works
```

---

# 43. Final Agent Rule

Do not optimize for the number of features.

Optimize for:

```text
Operational usefulness
+
Visual quality
+
Reliable end-to-end flow
+
Explainable AI
+
Real-time coordination
```

The final product should feel like a **professional AI-assisted Emergency Command Center**, not a college CRUD project with charts added at the end.
