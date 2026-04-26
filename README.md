# iTarla Map — Frontend

Vanilla JS + Leaflet.js web application for the iTarla smart irrigation system.
Displays an interactive farm map with real-time sensor readings, motor controls, irrigation schedules, and automation.

---

## Architecture Overview

```
[This Frontend]
     │
     ├─── REST API calls (JWT Bearer) ──► iTarlaMapBackend  (localhost:5212)
     │                                        └── MongoDB
     │
     └─── Real-time listeners ──────────► Firebase Firestore
                                              ├── Motors/{deviceCode}   (live motor status)
                                              ├── Sensors/{deviceCode}  (live sensor readings)
                                              └── SystemStatus/global   (rain mode, tank level)
```

**The frontend talks to two things simultaneously:**
1. The REST backend for persistent data (CRUD operations)
2. Firebase directly for live/real-time updates (no polling needed)

---

## No Build Step Required

This is a plain HTML/CSS/JS project — no Node, no webpack, no npm.
Just open `index.html` in a browser (or serve with any static file server).

```bash
# Option 1 — Python static server
cd C:/Dev/map
python -m http.server 8080
# then open http://localhost:8080

# Option 2 — VS Code Live Server extension
# Right-click index.html → "Open with Live Server"

# Option 3 — Any static host (Netlify, GitHub Pages, etc.)
```

---

## Pages

| File | Description |
|------|-------------|
| `login.html` | Login with email + password — calls JwtIdentity backend |
| `register.html` | New account registration |
| `index.html` | Main map — farms, sensors, motors, schedules, alerts |
| `log.html` | Irrigation event log with filters, pagination, delete |
| `dashboard.html` | Charts & statistics (Chart.js, client-side aggregation) |

---

## File Structure

```
index.html          Main map page shell + all modal HTML
style.css           All styles for the map page

script.js           Core logic: auth, map init, sensor/motor forms, placement
loaders.js          Firebase listeners, popup builders, sidebar renders,
                    motor/sensor CRUD, alerts panel, auto mode config modal
schedule.js         Schedule modal, auto mode sidebar, day/timezone helpers
Polygon.js          Farm polygon drawing tool
toolbarbuttons.js   Leaflet toolbar button definitions
icons.js            Custom Leaflet marker icons
Data.js             Static class definitions (legacy)
firebase-live.js    Firebase JS SDK initialization (exposes globals)

login.html/css/js   Login page
register.html/css/js  Registration page
log.html            Irrigation log page (self-contained)
dashboard.html      Dashboard page (self-contained)

images/             Icon images for map toolbar buttons and popups
```

---

## Firebase Configuration

Firebase client config is already in `firebase-live.js` — **no changes needed**.
The frontend uses the public Firebase web SDK (client keys are safe to be public;
security is enforced by Firebase Security Rules on the Firestore side).

```js
// firebase-live.js — already configured for project emocc-esp32
const firebaseConfig = {
  apiKey: "...",
  projectId: "emocc-esp32",
  ...
};
```

---

## Backend URL

All REST API calls point to `http://localhost:5212`.
For production, do a find-and-replace across all JS files:

```
Find:    http://localhost:5212
Replace: https://your-production-api-domain.com
```

Files to update: `script.js`, `loaders.js`, `schedule.js`, `log.html`, `dashboard.html`

---

## Auth Flow

1. User logs in via `login.html` → calls JwtIdentity backend → receives JWT
2. JWT stored in `localStorage` as `"token"`
3. Every API call to iTarlaMapBackend sends `Authorization: Bearer <token>`
4. Each API response is scoped to the logged-in farmer (no farmer can see another's data)
5. On logout → token removed → redirect to `login.html`

---

## Map Features

### Farms
- Draw polygon on map → saved to backend → displayed with chosen color
- Click polygon to select it before placing sensors/motors inside

### Sensors
- Place by clicking inside a farm polygon
- Requires a valid `deviceCode` that exists in Firebase (`Sensors/{deviceCode}`)
- Live readings (temperature, moisture, pH, conductivity, battery) stream via Firebase

### Motors
- Place by clicking inside a farm polygon
- Three control modes:
  - **Manual** — toggle on/off via popup switch
  - **Scheduled** — time-window or interval-based, configured in schedule modal
  - **Auto** — moisture-based, links to sensors, has lower/upper thresholds

### Schedule Modal
- **Interval mode**: runs every N hours for M minutes
- **Time-window mode**: runs at specific times (HH:MM Baku time, auto-converted to UTC)
- Safety options: max runtime, forbidden hours, sensor data freshness check, allowed days of week

### Auto Mode
- Link one or more sensors to a motor
- Set lower threshold (turn ON below X%) and upper threshold (turn OFF above Y%)
- Background engine (`IrrigationHostedService`) checks every 60 seconds

### Alerts Panel (top-center)
- Red = critical (sensor offline, battery < 15%)
- Orange = warning (battery < 30%, motor running > 3h, critically dry soil, auto motor with no sensors)
- Fully real-time — updates whenever Firebase pushes new data

### System Status Bar
- Shows active system conditions: Rain Mode, Low Tank, Irrigation Blocked
- Driven by `SystemStatus/global` document in Firestore

---

## Real-Time Architecture

All real-time updates use Firebase `onSnapshot` listeners — no polling.

```
Firebase snapshot fires
  → updates motorObj.data / sensorObj.data in memory
  → updates popup DOM elements (status, toggle, hours)
  → calls renderMotorSidebar() / renderSensorSidebar()   → updates sidebar dots
  → calls renderAlerts()                                  → updates alerts panel
```

Listeners are attached for **all motors and sensors on page load** (not just on popup open),
so the sidebar and alerts are always live even without clicking anything.

---

## Log Page (`log.html`)

- Paginated irrigation event log (50 per page)
- Filters: All / Started / Completed / Auto / Safety / Failed
- Stats: total, completed, failed/skipped, last event time
- Per-row delete with confirmation dialog
- Clear All with confirmation
- Auto-refreshes every 60 seconds
- All times shown in Baku time (UTC+4)

---

## Dashboard Page (`dashboard.html`)

- Fetches last 1000 log entries + all sensors + all motors in parallel
- All aggregation is **client-side** (no extra backend endpoints needed)
- 6 stat cards: Irrigations (7d), Success Rate, Active Motors, Online Sensors, Safety Stops (7d), Total Events
- 4 charts: Daily activity (bar), Event types (doughnut), Starts per motor (horizontal bar), Hourly pattern
- Motor table: mode, status, starts/fails in last 7 days, runtime bar
- Sensor grid: moisture %, temperature, pH, battery per sensor

---

## Deployment Checklist

- [ ] Update `http://localhost:5212` to production API URL in all JS files
- [ ] iTarlaMapBackend must be deployed and accessible
- [ ] JwtIdentity backend must be deployed and accessible
- [ ] Firebase project `emocc-esp32` Security Rules allow reads for authenticated users
- [ ] Serve over HTTPS (required for Firebase JS SDK in production)
- [ ] Update CORS on the backend to allow your frontend domain

---

## Related Repositories

| Repo | Purpose |
|------|---------|
| [iTarlaMapBackend](https://github.com/AnarNajaf/CRUD-Operation-With-MongoDB-RESTful-API) | Main API + background irrigation engine |
| [JwtIdentity](https://github.com/abdullayevemil/JwtIdentity) | Auth backend — login, register, JWT issuance |
