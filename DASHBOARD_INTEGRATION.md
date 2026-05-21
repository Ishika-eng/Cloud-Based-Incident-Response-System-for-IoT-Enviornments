# Dashboard Integration Document
### Cloud-Based Incident Response System for IoT Environments

| | |
|---|---|
| **Prepared for** | Person 4 — Frontend Developer |
| **Prepared by** | Person 2/3 — Backend & Security Engine |
| **Date** | 16 May 2026 |
| **Backend Status** | ✅ Live & Connected to MongoDB Atlas |

---

## Table of Contents
1. [Overview](#1-overview)
2. [Recommended Tech Stack](#2-recommended-tech-stack)
3. [Backend Connection Details](#3-backend-connection-details)
4. [Authentication](#4-authentication)
5. [REST API Endpoints](#5-rest-api-endpoints)
6. [Real-Time Socket.IO Events](#6-real-time-socketio-events)
7. [Recommended Dashboard Pages](#7-recommended-dashboard-pages)
8. [UI Consistency Standards](#8-ui-consistency-standards)
9. [Ready-to-Use API Helper File](#9-ready-to-use-api-helper-file)
10. [Integration Checklist](#10-integration-checklist)
11. [Testing Locally](#11-testing-locally)

---

## 1. Overview

This document contains everything needed to build and integrate the Admin Dashboard with the live backend. The backend is fully built, tested, and connected to MongoDB Atlas.

**No backend changes are needed.** The dashboard only consumes the APIs and Socket.IO events described here.

The dashboard has two data channels:

| Channel | Purpose |
|---|---|
| **REST API** | Fetch and update data (devices, incidents) |
| **Socket.IO (WebSocket)** | Real-time live updates (alerts, telemetry, status changes) |

---

## 2. Recommended Tech Stack

As per `implementation_plan.md`:

| Package | Purpose |
|---|---|
| `axios` | REST API calls |
| `socket.io-client` | Real-time WebSocket connection |
| `recharts` | Live traffic and incident graphs |
| `lucide-react` | Security-themed icons |
| `framer-motion` | Smooth UI transitions and animations |
| `tailwindcss` | Styling |

**Install commands:**
```bash
npx create-react-app dashboard
npm install axios socket.io-client recharts lucide-react framer-motion
```

---

## 3. Backend Connection Details

| Setting | Value |
|---|---|
| **Local Backend URL** | `http://localhost:5001` |
| **WebSocket URL** | `ws://localhost:5001` |
| **Deployed URL** | Railway URL (shared separately) |
| **Auth Method** | JWT Bearer Token |
| **Content-Type** | `application/json` |

---

## 4. Authentication

The dashboard must register itself as a device **once on first load** to get a JWT token. This token is then attached to every API call.

### Step 1 — Register the Dashboard (once)

```
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "DASHBOARD-ADMIN",
  "type": "gateway",
  "ipAddress": "192.168.1.200",
  "location": "Admin Panel"
}
```

**Response** (`201 Created`, or `200` if device already exists):
```json
{
  "deviceId": "uuid-string",
  "token": "eyJhbGci...",
  "device": {
    "id": "uuid-string",
    "name": "DASHBOARD-ADMIN",
    "type": "gateway",
    "status": "Active",
    "ipAddress": "192.168.1.200",
    "location": "Admin Panel"
  }
}
```

### Step 2 — Store and attach the token

```js
localStorage.setItem('dashboard_token', response.data.token);
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

> ⚠️ **Note:** If the register call returns `200` instead of `201`, the device already exists — the token in the response is still valid, use it normally.

---

## 5. REST API Endpoints

### 5.1 Get All Devices

```
GET /api/devices
Authorization: Bearer <token>
```

**Optional query params:**
- `?status=Active`
- `?status=Blocked`

**Response:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "name": "TEMP-SENSOR-1",
      "type": "sensor",
      "status": "Active",
      "ipAddress": "192.168.1.5",
      "location": "Warehouse A",
      "lastSeen": "2026-05-16T05:45:37.459Z",
      "baselineTraffic": 10,
      "unresolvedIncidents": 3
    }
  ]
}
```

**Field notes:**
- `status` — always `"Active"` or `"Blocked"`
- `type` — always one of `"sensor"`, `"actuator"`, `"gateway"`, `"camera"`
- `unresolvedIncidents` — count of open incidents for that device

---

### 5.2 Block a Device (Manual)

```
PATCH /api/devices/:id/block
Authorization: Bearer <token>
```

No request body needed.

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "name": "TEMP-SENSOR-1",
    "status": "Blocked"
  }
}
```

---

### 5.3 Unblock a Device

```
PATCH /api/devices/:id/unblock
Authorization: Bearer <token>
```

No request body needed.

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "name": "TEMP-SENSOR-1",
    "status": "Active"
  }
}
```

---

### 5.4 Get All Incidents

```
GET /api/incidents
Authorization: Bearer <token>
```

**Optional query params:**
- `?severity=Critical`
- `?deviceId=uuid`
- `?limit=100` (default 50)

**Response:**
```json
{
  "incidents": [
    {
      "incidentId": "ALT-9e757be8",
      "deviceId": "uuid",
      "type": "Brute Force",
      "severity": "Critical",
      "timestamp": "2026-05-16T05:45:37.472Z"
    }
  ]
}
```

**Field notes:**
- `type` values: `"DDoS"`, `"Brute Force"`, `"Anomaly"`, `"Unauthorized"`, `"Rogue Device"`, `"Unknown"`
- `severity` values: `"Low"`, `"Medium"`, `"High"`, `"Critical"`
- Results are sorted **newest first**

---

### 5.5 Resolve an Incident

```
PATCH /api/incidents/:incidentId/resolve
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "resolution": "Investigated and cleared by admin"
}
```

**Response:**
```json
{
  "success": true,
  "incident": {
    "incidentId": "ALT-9e757be8",
    "deviceId": "uuid",
    "type": "Brute Force",
    "severity": "Critical",
    "timestamp": "2026-05-16T05:45:37.472Z"
  }
}
```

---

### 5.6 Health Check

```
GET /health
(No Authorization required)
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600.5,
  "database": "connected"
}
```

> Use this to show a **server/database status indicator** on the dashboard.

---

## 6. Real-Time Socket.IO Events

**How to connect:**
```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');
socket.on('connect', () => console.log('Live feed connected'));
```

The server emits **6 events**. The dashboard should listen to all of them.

---

### Event 1: `threat-detected`
> Fires every time **any** threat is detected on **any** device.
> **Use for:** Live scrolling alert feed.

```json
{
  "alertId": "ALT-9e757be8",
  "deviceId": "uuid",
  "threatType": "Brute Force",
  "severity": "Critical",
  "timestamp": "2026-05-16T05:45:37.472Z",
  "details": "5 failed login attempts detected.",
  "status": "Blocked"
}
```

`threatType` values: `"DDoS"`, `"Brute Force"`, `"Anomaly"`, `"Unauthorized"`, `"Rogue Device"`

---

### Event 2: `device-compromised`
> Fires when a device is **auto-blocked** due to a Critical severity threat.
> **Use for:** Red full-screen or popup critical alert modal.

```json
{
  "alertId": "ALT-xxxx",
  "deviceId": "uuid",
  "threatType": "System Compromised",
  "severity": "Critical",
  "timestamp": "2026-05-16T05:45:37.472Z",
  "details": "Device status changed to Blocked due to critical threats",
  "status": "Blocked",
  "device": {
    "id": "uuid",
    "name": "TEMP-SENSOR-1",
    "type": "sensor",
    "ipAddress": "192.168.1.5",
    "location": "Warehouse A",
    "status": "Blocked"
  }
}
```

---

### Event 3: `live-telemetry`
> Fires on **every telemetry packet** received from every device (every few seconds).
> **Use for:** Live traffic graph, live device activity feed.

```json
{
  "deviceId": "uuid",
  "timestamp": "2026-05-16T05:45:37.472Z",
  "type": "heartbeat",
  "data": {
    "cpuUsage": 12,
    "ramUsage": 35,
    "packetFrequency": 1,
    "loginStatus": "SUCCESS"
  },
  "device": {
    "id": "uuid",
    "name": "TEMP-SENSOR-1",
    "type": "sensor",
    "status": "Active",
    "ipAddress": "192.168.1.5",
    "location": "Warehouse A"
  },
  "incidents": []
}
```

`type` values: `"heartbeat"`, `"login"`, `"traffic_spike"`

---

### Event 4: `device-blocked`
> Fires when a device is **manually blocked** via the dashboard.
> **Use for:** Updating device status in real-time across all open tabs.

```json
{
  "device": {
    "id": "uuid",
    "name": "TEMP-SENSOR-1",
    "type": "sensor",
    "status": "Blocked",
    "ipAddress": "192.168.1.5",
    "location": "Warehouse A",
    "lastSeen": "2026-05-16T05:45:37.459Z"
  }
}
```

---

### Event 5: `device-unblocked`
> Fires when a device is manually unblocked.
> **Use for:** Same as `device-blocked` — update UI in real-time.

```json
{
  "device": {
    "id": "uuid",
    "name": "TEMP-SENSOR-1",
    "type": "sensor",
    "status": "Active",
    "ipAddress": "192.168.1.5",
    "location": "Warehouse A",
    "lastSeen": "2026-05-16T05:45:37.459Z"
  }
}
```

---

### Event 6: `incident-resolved`
> Fires when an incident is marked as resolved.
> **Use for:** Remove or mark resolved in the incidents list in real-time.

```json
{
  "incidentId": "ALT-9e757be8",
  "deviceId": "uuid",
  "type": "Brute Force",
  "severity": "Critical",
  "timestamp": "2026-05-16T05:45:37.472Z"
}
```

---

## 7. Recommended Dashboard Pages

### Page 1 — Overview / Home

| Component | Data Source | Notes |
|---|---|---|
| Total Devices | `GET /api/devices` → `devices.length` | Static count |
| Active Devices | `GET /api/devices?status=Active` | Green badge |
| Blocked Devices | `GET /api/devices?status=Blocked` | Red badge |
| Total Incidents | `GET /api/incidents` | All time |
| Critical Incidents | `GET /api/incidents?severity=Critical` | Highlighted |
| Server Status | `GET /health` → `status` field | Green/Red dot |
| Database Status | `GET /health` → `database` field | Green/Red dot |

---

### Page 2 — Live Monitor

| Component | Data Source | Notes |
|---|---|---|
| Live Alert Feed | Socket: `threat-detected` | Auto-scrolling list |
| Traffic Graph | Socket: `live-telemetry` → `data.packetFrequency` | Line chart via Recharts |
| CPU/RAM Graph | Socket: `live-telemetry` → `data.cpuUsage` / `ramUsage` | Line chart via Recharts |
| Critical Alert Popup | Socket: `device-compromised` | Full-screen red modal |

---

### Page 3 — Devices

| Component | Data Source | Notes |
|---|---|---|
| Device Table/Cards | `GET /api/devices` | All 20 devices |
| Status Badge | `device.status` | Active = green, Blocked = red |
| Device Type Icon | `device.type` | sensor / gateway / actuator / camera |
| Last Seen | `device.lastSeen` | Format as relative time |
| Unresolved Count | `device.unresolvedIncidents` | Warning badge |
| Block Button | `PATCH /api/devices/:id/block` | Show when `status === "Active"` |
| Unblock Button | `PATCH /api/devices/:id/unblock` | Show when `status === "Blocked"` |
| Real-time Updates | Socket: `device-blocked`, `device-unblocked`, `device-compromised` | Update without page refresh |

---

### Page 4 — Incidents

| Component | Data Source | Notes |
|---|---|---|
| Incidents Table | `GET /api/incidents` | Sorted newest first |
| Filter by Severity | `?severity=` query param | Dropdown filter |
| Filter by Device | `?deviceId=` query param | Device selector |
| Resolve Button | `PATCH /api/incidents/:id/resolve` | Per row action |
| New Incident Highlight | Socket: `threat-detected` | Highlight new rows |
| Severity Badge | `incident.severity` | Colour-coded (see Section 8) |

---

## 8. UI Consistency Standards

### Severity Colour Mapping
> Use these exact colours everywhere — badges, alerts, charts, borders.

| Severity | Hex Colour | Usage |
|---|---|---|
| `Critical` | `#ef4444` | Red — auto-block, brute force |
| `High` | `#f97316` | Orange — DDoS, sensor anomaly |
| `Medium` | `#eab308` | Yellow — unauthorized access |
| `Low` | `#22c55e` | Green — minor anomalies |

### Device Status Colours

| Status | Hex Colour |
|---|---|
| `Active` | `#22c55e` (green) |
| `Blocked` | `#ef4444` (red) |

### Threat Type → Lucide Icon Mapping

| Threat Type | Lucide Icon Name |
|---|---|
| `DDoS` | `Zap` |
| `Brute Force` | `KeyRound` |
| `Rogue Device` | `Skull` |
| `Anomaly` | `ActivitySquare` |
| `Unauthorized` | `ShieldOff` |
| `Unknown` | `HelpCircle` |

### Device Type → Lucide Icon Mapping

| Device Type | Lucide Icon Name |
|---|---|
| `sensor` | `Thermometer` |
| `gateway` | `Router` |
| `actuator` | `Settings` |
| `camera` | `Camera` |

---

## 9. Ready-to-Use API Helper File

Create this file as `src/api.js` in the React project and import from it everywhere.

```js
import axios from 'axios';
import { io } from 'socket.io-client';

// ─── Change this to Railway URL when deploying ────────────────────────────────
export const BASE_URL = 'http://localhost:5001';
export const socket   = io(BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

// ─── Call this once in App.js on load ─────────────────────────────────────────
export async function initDashboard() {
  const stored = localStorage.getItem('dashboard_token');
  if (stored) {
    api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
    return stored;
  }
  const res = await api.post('/api/auth/register', {
    name:      'DASHBOARD-ADMIN',
    type:      'gateway',
    ipAddress: '192.168.1.200',
    location:  'Admin Panel'
  });
  const token = res.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('dashboard_token', token);
  return token;
}

// ─── REST API helpers ─────────────────────────────────────────────────────────
export const getDevices      = (params) => api.get('/api/devices', { params });
export const getIncidents    = (params) => api.get('/api/incidents', { params });
export const blockDevice     = (id)     => api.patch(`/api/devices/${id}/block`);
export const unblockDevice   = (id)     => api.patch(`/api/devices/${id}/unblock`);
export const resolveIncident = (id, resolution) =>
  api.patch(`/api/incidents/${id}/resolve`, { resolution });
export const getHealth       = ()       => api.get('/health');

// ─── Socket.IO event name constants (use these to avoid typos) ───────────────
export const SOCKET_EVENTS = {
  THREAT_DETECTED    : 'threat-detected',
  DEVICE_COMPROMISED : 'device-compromised',
  LIVE_TELEMETRY     : 'live-telemetry',
  DEVICE_BLOCKED     : 'device-blocked',
  DEVICE_UNBLOCKED   : 'device-unblocked',
  INCIDENT_RESOLVED  : 'incident-resolved',
};
```

**Usage example in a component:**
```js
import { useEffect, useState } from 'react';
import { getDevices, socket, SOCKET_EVENTS } from './api';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // Fetch initial data
    getDevices().then(res => setDevices(res.data.devices));

    // Listen for real-time updates
    socket.on(SOCKET_EVENTS.DEVICE_COMPROMISED, (data) => {
      setDevices(prev =>
        prev.map(d => d.id === data.device.id ? { ...d, status: 'Blocked' } : d)
      );
    });

    return () => socket.off(SOCKET_EVENTS.DEVICE_COMPROMISED);
  }, []);

  return ( /* render devices */ );
}
```

---

## 10. Integration Checklist

| Task | Done |
|---|---|
| Install all packages (`axios`, `socket.io-client`, `recharts`, `lucide-react`, `framer-motion`) | `[ ]` |
| Create `src/api.js` with the helper file from Section 9 | `[ ]` |
| Call `initDashboard()` in `App.js` on load | `[ ]` |
| Connect socket and listen to all 6 events | `[ ]` |
| Build Overview page with stats from REST API | `[ ]` |
| Build Live Monitor page with socket events | `[ ]` |
| Build Devices page with block/unblock buttons | `[ ]` |
| Build Incidents page with resolve button | `[ ]` |
| Apply severity colour standards from Section 8 | `[ ]` |
| Apply threat type and device type icon mapping | `[ ]` |
| Test with backend running on `localhost:5001` | `[ ]` |
| Test with IoT Simulator running (`node IotSimulator.js`) | `[ ]` |
| Update `BASE_URL` in `api.js` to Railway deployed URL | `[ ]` |

---

## 11. Testing Locally

To see **real data flowing** into the dashboard during development:

**Terminal 1 — Start the backend:**
```bash
cd iot-backend
node server.js
```

**Terminal 2 — Start the IoT Simulator:**
```bash
node IotSimulator.js
```

**Terminal 3 — Start the dashboard:**
```bash
cd dashboard
npm start
```

**What happens:**
- The simulator registers all 20 devices automatically
- Normal telemetry starts flowing every 2 seconds → visible on Live Monitor
- After **60 seconds**, attack scenarios trigger automatically:
  - 🔥 Brute Force on `RFID-ACCESS-READER`
  - 🌪 DDoS on `NETWORK-MONITOR`
  - 🕵️ Rogue Device spoofing
  - 🌡 Sensor Manipulation on `TEMP-SENSOR-1`
  - 🚫 Unauthorized Access on `SMART-DOOR-LOCK`
- All attacks appear in the dashboard in **real-time** via Socket.IO

---

*Document generated from live backend code — all endpoints, payloads, and event names are verified against the actual running system.*
