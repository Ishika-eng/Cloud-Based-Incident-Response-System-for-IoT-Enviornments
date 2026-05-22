# Cloud-Based Incident Response System for IoT Environments
## Complete System Documentation

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Hardware — ESP32 Nodes](#3-hardware--esp32-nodes)
4. [Backend — Core Components](#4-backend--core-components)
   - [Security Engine (EMA Adaptive Baseline)](#41-security-engine--ema-adaptive-baseline)
   - [ML Anomaly Detector (Isolation Forest)](#42-ml-anomaly-detector--isolation-forest)
   - [Cross-Device Correlation Engine](#43-cross-device-correlation-engine)
5. [Backend — API Routes](#5-backend--api-routes)
6. [Frontend — Dashboard](#6-frontend--dashboard)
7. [Deployment](#7-deployment)
8. [How to Verify Every Feature](#8-how-to-verify-every-feature)
9. [Threat Detection Reference](#9-threat-detection-reference)
10. [Telemetry Payload Format](#10-telemetry-payload-format)

---

## 1. Project Overview

**ThreatNest** is a real-time cloud-based security monitoring and incident response system designed for IoT environments. It connects physical ESP32 sensor nodes to a cloud backend that analyses every telemetry packet for security threats using three layers of detection:

| Layer | Technology | What it catches |
|---|---|---|
| 1 | EMA Adaptive Baseline (z-score) | Per-device anomalies in traffic, CPU, memory, temperature |
| 2 | Isolation Forest (ML) | Unusual multivariate combinations that z-score misses |
| 3 | Correlation Engine | Coordinated multi-device attacks (DDoS, lateral movement, etc.) |

**Key design decisions:**
- Sensor data is **never stored in MongoDB** — it lives in an in-memory cache to avoid database bloat
- All ML/baseline state is also in-memory — no external ML service needed, zero extra cost
- Single WebSocket connection per dashboard client (singleton provider pattern)
- Every component guards against `Invalid Date` crashes using `safeFormat` wrappers

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ESP32 IoT Nodes                          │
│  Node 1 (Environmental)  │  Node 2 (Login)  │  Node 3 (Alerts) │
└──────────────┬───────────┴────────┬─────────┴──────────────────┘
               │ POST /api/telemetry │
               ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Railway Cloud Backend (Node.js)                 │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Auth MW    │  │  Security Engine  │  │  Correlation     │   │
│  │ (API Key)   │→ │  (EMA z-score)    │→ │  Engine          │   │
│  └─────────────┘  └──────────────────┘  └──────────────────┘   │
│                            │                      │              │
│                            ▼                      ▼              │
│                   ┌──────────────────┐  ┌──────────────────┐   │
│                   │  ML Isolation    │  │  Incident Model  │   │
│                   │  Forest          │  │  (MongoDB)       │   │
│                   └──────────────────┘  └──────────────────┘   │
│                                                                  │
│  In-memory: sensorCache, deviceStateCache, eventLog             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Socket.IO (WebSocket)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  React Dashboard (Vite + TailwindCSS)            │
│                                                                  │
│  LiveFeed  │  PacketsChart  │  LiveSensorPanel  │  Incidents    │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow per telemetry packet:**
1. ESP32 → POST `/api/telemetry` with device API key
2. Auth middleware validates key → loads device from MongoDB
3. `parseTelemetry()` normalises payload to standard fields
4. Sensor data cached in-memory (`sensorCache` Map) — no MongoDB write
5. `SecurityEngine.analyzeTelemetry()` runs 7 checks → returns threats array
6. `CorrelationEngine.analyze()` checks cross-device patterns → appends more threats
7. Each threat → `Incident` saved to MongoDB
8. All threats + live telemetry emitted via Socket.IO to dashboard
9. If any threat is `Critical` → device status set to `Blocked`

---

## 3. Hardware — ESP32 Nodes

### Node 1 — Environmental Sensor Node
- **Purpose:** Sends heartbeat telemetry with environmental sensor readings
- **Sensors:** Temperature, Humidity, Gas (MQ-series), Motion (PIR)
- **Send interval:** ~12 seconds
- **Telemetry type:** `heartbeat`
- **Key fields sent:** `cpuUsage`, `ramUsage`, `packetFrequency`, `sensorData`

### Node 2 — Login Event Node
- **Purpose:** Sends login attempt events
- **Telemetry type:** `login`
- **Key fields sent:** `loginStatus` (`SUCCESS` or `FAIL`), `authHeader`

### Node 3 — Alert Receiver Node
- **Purpose:** Receives alerts from the backend (does not send telemetry)
- **Role:** Displays on-device alerts (buzzer, LED) when incidents are detected

### Telemetry Payload (Standard Format)
```json
{
  "deviceId": "NODE-01-FRESH",
  "timestamp": "2026-05-22T14:30:00Z",
  "type": "heartbeat",
  "data": {
    "cpuUsage": 25,
    "ramUsage": 40,
    "packetFrequency": 200,
    "loginStatus": "SUCCESS",
    "authHeader": "Bearer eyJhbGciOiJIUzI1...",
    "sensorData": {
      "temperature": 28.5,
      "humidity": 65.2,
      "gasValue": 420,
      "motion": false
    }
  }
}
```

---

## 4. Backend — Core Components

### 4.1 Security Engine — EMA Adaptive Baseline

**File:** `iot-backend/SecurityEngine.js`

**What it does:** Analyses every telemetry packet for 7 types of threats. Each device learns its own normal behaviour over time — no manual threshold configuration needed.

#### How the Adaptive Baseline Works

**Phase 1 — Calibration (first 20 packets):**
- Collects raw metric values silently
- No alerts fired during this phase (avoids false positives on new devices)
- After 20 samples: computes initial `mean` and `stdDev`

**Phase 2 — Active Detection:**
- For each new value, computes z-score: `z = (value - mean) / stdDev`
- If `z > 3` → anomaly (value is 3 standard deviations above normal)
- Slowly updates baseline with EMA (α=0.02) so legitimate long-term changes are absorbed

```
alpha = 0.02
mean   = mean   × 0.98 + newValue × 0.02
stdDev = max(0.5, stdDev × 0.98 + |newValue - mean| × 0.02)
```

**Why EMA instead of static thresholds:**
- A server-room sensor at 55°C normally would never trigger an 80°C static threshold
- But if it suddenly reads 72°C, EMA catches it (z ≈ 8.5σ above its own 55°C baseline)
- A gateway running at 70% CPU normally would be missed by a 95% static threshold
- If it jumps to 85% (cryptominer), EMA catches it immediately

#### 7 Detection Checks (run in order)

| # | Check | Trigger | Severity |
|---|---|---|---|
| 1 | **Rogue Device** | `deviceId` in payload doesn't match registered device | Critical |
| 2 | **DDoS** | `packetFrequency` > 3σ above device's learned baseline | High |
| 3 | **Brute Force** | 5+ consecutive login `FAIL` events | Critical |
| 4 | **Sensor Manipulation (Range)** | Temperature outside -10°C to 80°C | High |
| 4b | **Sensor Manipulation (Delta)** | Temperature jump > 15°C between packets | Medium |
| 4c | **Sensor Manipulation (Adaptive)** | Temperature > 3σ above device's own baseline | Medium |
| 5 | **Unauthorized Access** | Invalid/missing Bearer token format | Medium |
| 6 | **CPU Anomaly** | CPU% > 3σ above device's learned normal | Medium |
| 6b | **Memory Anomaly** | RAM% > 3σ above device's learned normal | Low |
| 7 | **ML Anomaly** | Isolation Forest score > 0.65 (see below) | High |

#### DDoS Detection Threshold Calculation
```
After calibration with constant traffic=200:
  mean   = 200
  stdDev = 0.5 (floored minimum)
  threshold = 200 + 3×0.5 = 201.5 pkt/s

→ Any value ≥ 202 triggers DDoS

With variable traffic (100–400 range):
  mean   ≈ 250
  stdDev ≈ 75
  threshold = 250 + 3×75 = 475 pkt/s
```

#### Railway Deploy Log Lines (EMA)
```
[EMA] Calibrating metric="traffic": 1/20 samples        ← first packet
[EMA] Calibrating metric="traffic": 5/20 samples        ← every 5 samples
[EMA] Calibrating metric="traffic": 10/20 samples
[EMA] Calibrating metric="traffic": 15/20 samples
[EMA] Baseline calibrated for metric="traffic": mean=200.00, stdDev=0.50, threshold=201.50
[EMA] metric="traffic" value=500, zScore=600.00, mean=200.00, ANOMALY=true
```

---

### 4.2 ML Anomaly Detector — Isolation Forest

**File:** `iot-backend/MLAnomalyDetector.js`

**What it does:** Analyses ALL metrics together (CPU + traffic + memory + temperature + humidity + gas) as a combined feature vector. Catches attacks that look normal on any single metric but are statistically impossible as a combination.

**Example:** `cpu=50%` looks normal alone. `cpu=50% + traffic=8000 + memory=88%` together is impossible for this device's normal behaviour — the Isolation Forest catches it.

#### How Isolation Forest Works

1. **Training:** Build 100 random binary decision trees on the device's normal data
2. **Scoring:** For a new data point, measure how quickly it gets "isolated" in the trees
   - **Normal points** need many splits to isolate (long path = normal)
   - **Anomalies** get isolated near the root (short path = anomaly)
3. **Score:** `2^(-avgPathLength / c(n))`
   - Score > 0.65 → anomaly
   - Score > 0.75 → strong anomaly
   - Score < 0.45 → normal

#### Calibration Timeline
```
Packets 1–49:   Collecting training samples (silent)
Packet 50:      Model trained — [ML] Isolation Forest trained for device X
Packets 51+:    Every packet scored in real-time
Every 100 pkt:  Model retrained on latest data to adapt to legitimate changes
```

#### Feature Vector
```javascript
{
  cpu:         raw CPU %
  memory:      raw RAM %
  traffic:     log(1 + packetFrequency)   // log-scaled — ranges 0 to 100,000+
  temperature: raw °C
  humidity:    raw %
  gasValue:    log(1 + gasValue)          // log-scaled
}
```

#### Deduplication
ML alert only fires if EMA z-score didn't already catch the same event — prevents double-alerting for the same threat.

#### Railway Deploy Log Lines (ML)
```
[ML] Device abc123 calibrating: 10/50 samples         ← every 10 packets
[ML] Isolation Forest trained for device abc123 on 50 samples
[ML] Device abc123 score=0.712 features={...} ANOMALY=true
[ML] Isolation Forest retrained for device abc123 (150 total packets)
```

---

### 4.3 Cross-Device Correlation Engine

**File:** `iot-backend/CorrelationEngine.js`

**What it does:** After per-device analysis, asks "Did OTHER devices see something similar recently?" Every basic IoT security system monitors devices in isolation. This engine sees the entire network as a whole.

**Architecture:** Module-level singleton with a 60-second sliding event window. Runs after every SecurityEngine analysis. All threats from all devices accumulate in a shared event log that is automatically pruned.

#### 4 Attack Patterns Detected

**Pattern 1 — Coordinated DDoS**
- Trigger: 2+ different devices hit with DDoS threat within 30 seconds
- Meaning: Botnet or orchestrated volumetric attack across the network
- Severity: Critical

**Pattern 2 — Lateral Movement**
- Trigger: Brute Force on Device A → DDoS/Anomaly/Unauthorized on Device B within 60 seconds
- Meaning: Attacker compromised Device A and pivoted to Device B
- Severity: Critical
- Example: Node 2 gets 5 failed logins → 4 seconds later Node 1 shows traffic spike

**Pattern 3 — Network Sweep**
- Trigger: 3+ devices all get DDoS or Anomaly within 20 seconds
- Meaning: Network scanner or worm propagating across the IoT environment
- Severity: Critical

**Pattern 4 — Synchronized Brute Force**
- Trigger: 2+ devices hit with Brute Force within 15 seconds
- Meaning: Automated credential stuffing — same stolen passwords tested across all devices
- Severity: Critical

#### Alert Cooldown
Each pattern has a 30-second cooldown to prevent flooding. The same pattern won't re-alert within 30 seconds even if conditions remain true.

#### Railway Deploy Log Lines (Correlation)
```
[CORRELATION] 1 cross-device pattern(s) detected involving NODE-01-FRESH
  → Lateral Movement: Brute Force on "NODE-02" followed by DDoS on "NODE-01-FRESH" 4.2s later.
  → Coordinated Attack: Coordinated DDoS detected across 2 devices simultaneously.
```

---

## 5. Backend — API Routes

### Authentication Routes — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new IoT device, returns API key |
| POST | `/api/auth/login` | Dashboard user login |

### Telemetry Routes — `/api/telemetry`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/telemetry` | Device API Key | Submit telemetry packet — runs all detection |
| GET | `/api/telemetry/status` | Device API Key | Get device status + recent incidents |
| GET | `/api/telemetry/sensors/latest` | Device API Key | Get latest sensor readings from in-memory cache |
| GET | `/api/telemetry/incidents` | Device API Key | Get last 50 incidents |
| PATCH | `/api/telemetry/incidents/:id/resolve` | Device API Key | Resolve an incident |

### Device Routes — `/api/devices`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/devices` | JWT | List all registered devices |
| GET | `/api/devices/:id` | JWT | Get single device |
| PATCH | `/api/devices/:id` | JWT | Update device |
| DELETE | `/api/devices/:id` | JWT | Delete device |

### Incident Routes — `/api/incidents`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/incidents` | JWT | List all incidents (paginated) |
| PATCH | `/api/incidents/:id/resolve` | JWT | Resolve incident from dashboard |

### Debug Routes (No Auth)
| Method | Path | Description |
|---|---|---|
| GET | `/debug/baseline` | All devices' EMA + ML baseline status |
| GET | `/debug/baseline/:deviceId` | Single device EMA + ML status |
| GET | `/debug/correlation` | Current sliding event window (last 60s) |
| GET | `/health` | Server health + MongoDB connection status |

---

## 6. Frontend — Dashboard

**Stack:** React 18 + Vite + TailwindCSS + Framer Motion + Recharts + Socket.IO Client

### Key Components

| Component | File | Purpose |
|---|---|---|
| `LiveFeed` | `src/components/dashboard/LiveFeed.jsx` | Real-time event stream from all devices |
| `PacketsChart` | `src/components/dashboard/PacketsChart.jsx` | Network traffic line chart (Recharts) |
| `LiveSensorPanel` | `src/components/dashboard/LiveSensorPanel.jsx` | Temperature, humidity, gas, motion readings |
| `RecentIncidents` | `src/components/dashboard/RecentIncidents.jsx` | Last 5 incidents with severity badges |
| `DeviceTable` | `src/components/dashboard/DeviceTable.jsx` | All registered devices + status |
| `IncidentTable` | `src/components/incidents/IncidentTable.jsx` | Full incident log with filters |
| `NotificationPanel` | `src/components/ui/NotificationPanel.jsx` | Live alert notifications |

### WebSocket Architecture

**Singleton pattern** — one Socket.IO connection shared across the entire app via `WebSocketProvider` context.

```
App
└── WebSocketProvider (creates socket ONCE, never recreates)
    └── All components that call useWebSocket() share the same socket
```

**Socket.IO events received from backend:**

| Event | Payload | Used by |
|---|---|---|
| `live-telemetry` | Full telemetry + device + incidents | LiveFeed, PacketsChart |
| `threat-detected` | Single threat object | NotificationPanel, RecentIncidents |
| `device-compromised` | Device + threat details | DeviceTable, NotificationPanel |
| `incident-resolved` | Resolved incident | IncidentTable |

### Safe Date Formatting

**File:** `src/utils/dateFormat.js`

All date-fns calls are wrapped in safe helpers to prevent `Invalid Date` crashes from malformed ESP32 timestamps:

```javascript
safeFormat(value, 'HH:mm:ss')           // returns '--:--' on invalid date
safeDistanceToNow(value, { addSuffix }) // returns '--' on invalid date
```

### In-Memory Sensor Data Flow

```
1. Dashboard loads → GET /api/telemetry/sensors/latest → seeds LiveSensorPanel
2. ESP32 sends packet → backend updates sensorCache Map
3. Backend emits live-telemetry via Socket.IO
4. LiveSensorPanel merges new reading into local state
5. No MongoDB involved — purely in-memory
```

---

## 7. Deployment

### Backend — Railway
- **URL:** `https://friendly-elegance-production-0e93.up.railway.app`
- **Platform:** Railway (Node.js v24)
- **Auto-deploy:** On every push to `main` branch (GitHub integration connected)
- **Root directory:** `iot-backend`
- **Environment variables:** Set in Railway dashboard (MongoDB URI, JWT secret, etc.)
- **Rate limiting:** 100 requests per 10 seconds per device (with Railway proxy trust configured)

### Frontend — (Vite build)
- **Build:** `npm run build` → outputs to `dist/`
- **Deploy:** Serve `dist/` from any static host

### Important Railway Configuration
```javascript
// server.js — required for Railway's reverse proxy
app.set('trust proxy', 1);

// Rate limiter — suppress X-Forwarded-For warning
validate: { xForwardedForHeader: false }
```

---

## 8. How to Verify Every Feature

### ✅ Verify EMA Baseline Learning
1. Go to Railway → Deploy Logs
2. Wait for ESP32 packets — you'll see:
   ```
   [EMA] Calibrating metric="traffic": 5/20 samples
   [EMA] Calibrating metric="traffic": 10/20 samples
   [EMA] Baseline calibrated for metric="traffic": mean=200.00, stdDev=0.50
   ```
3. Or call the debug endpoint:
   ```
   GET /debug/baseline
   ```
   Returns calibration status for all devices.

### ✅ Verify ML Isolation Forest
1. Railway → Deploy Logs after 50+ packets:
   ```
   [ML] Isolation Forest trained for device abc123 on 50 samples
   ```
2. Or call:
   ```
   GET /debug/baseline
   ```
   Look for `"status": "trained"` in the ML section.

### ✅ Verify DDoS Detection
- Send a packet with `packetFrequency` > (mean + 3×stdDev)
- After EMA calibration with traffic=200 constant → any value ≥ 202 triggers it
- Deploy Logs will show: `[EMA] metric="traffic" ANOMALY=true`
- Dashboard shows a **High** DDoS incident

### ✅ Verify Brute Force Detection
- Send 5 consecutive packets with `loginStatus: "FAIL"` from the same device
- Deploy Logs: SecurityEngine detects 5th failure → Brute Force incident
- Dashboard shows a **Critical** Brute Force incident

### ✅ Verify Cross-Device Correlation
1. Open debug endpoint: `GET /debug/correlation`
   - Shows all threats in the 60-second sliding window
2. To trigger Lateral Movement:
   - Send 5 login failures from Node 2 (triggers Brute Force)
   - Within 60 seconds, Node 1 sends a high traffic spike (triggers DDoS)
   - Correlation Engine detects the pattern → Critical "Lateral Movement" incident
3. Deploy Logs show:
   ```
   [CORRELATION] 1 cross-device pattern(s) detected
     → Lateral Movement: Brute Force on "NODE-02" followed by DDoS on "NODE-01" 4.2s later.
   ```

### ✅ Verify Sensor Data Panel
- Open dashboard → Live Sensor Data panel (bottom left or right)
- Should show temperature, humidity, gas, motion from Node 1
- Data updates every ~12 seconds as Node 1 sends heartbeats
- No data in MongoDB — purely in-memory cache

### ✅ Verify Device Blocked on Critical Threat
- When any Critical threat fires → device `status` changes to `Blocked` in MongoDB
- Dashboard DeviceTable shows red "Blocked" badge
- `device-compromised` Socket.IO event fires

---

## 9. Threat Detection Reference

| Threat Type | Severity | Detection Method | Trigger |
|---|---|---|---|
| Rogue Device | Critical | Identity check | `deviceId` doesn't match registered device |
| DDoS | High | EMA z-score | Traffic > 3σ above device baseline |
| Brute Force | Critical | Counter | 5+ login failures in sequence |
| Anomaly (Range) | High | Static | Temperature outside -10°C to 80°C |
| Anomaly (Delta) | Medium | Static | Temperature jump > 15°C |
| Anomaly (Adaptive) | Medium | EMA z-score | Temperature > 3σ above device baseline |
| Unauthorized | Medium | Format check | Missing or malformed Bearer token |
| Anomaly (CPU) | Medium | EMA z-score | CPU% > 3σ above device baseline |
| Anomaly (Memory) | Low | EMA z-score | RAM% > 3σ above device baseline |
| Anomaly (ML) | High | Isolation Forest | Multivariate score > 0.65 |
| Coordinated Attack | Critical | Correlation | 2+ devices hit with DDoS within 30s |
| Lateral Movement | Critical | Correlation | Brute Force → DDoS on different device within 60s |
| Network Sweep | Critical | Correlation | 3+ devices hit with anomalies within 20s |
| Coordinated Attack (BF) | Critical | Correlation | 2+ devices hit with Brute Force within 15s |

---

## 10. Telemetry Payload Format

### Standard Format (ESP32 sends this)
```json
{
  "deviceId": "NODE-01-FRESH",
  "timestamp": "2026-05-22T14:30:00Z",
  "type": "heartbeat",
  "data": {
    "cpuUsage": 25,
    "ramUsage": 40,
    "packetFrequency": 200,
    "loginStatus": "SUCCESS",
    "authHeader": "Bearer <token>",
    "sensorData": {
      "temperature": 28.5,
      "humidity": 65.2,
      "gasValue": 420,
      "motion": false
    }
  }
}
```

### Field Mapping (Standard → Internal)
| ESP32 Field | Internal Field | Notes |
|---|---|---|
| `data.cpuUsage` | `telemetry.cpu` | 0–100 |
| `data.ramUsage` | `telemetry.memory` | 0–100 |
| `data.packetFrequency` | `telemetry.traffic` | packets/sec |
| `data.loginStatus` | `telemetry.loginStatus` | `SUCCESS` or `FAIL` |
| `data.authHeader` | `telemetry.authHeader` | `Bearer <token>` |
| `data.sensorData` | `telemetry.sensorData` | object |

### Validation Rules
- `type` must be `heartbeat`, `login`, or `traffic_spike`
- `cpuUsage` must be 0–100
- `ramUsage` must be 0–100
- `packetFrequency` must be ≥ 0
- `loginStatus` must be `SUCCESS` or `FAIL` (if provided)
- `authHeader` must start with `Bearer ` (if provided)

---

*Last updated: May 22, 2026*
*Git tag for stable baseline: `v1.0-working-baseline`*
