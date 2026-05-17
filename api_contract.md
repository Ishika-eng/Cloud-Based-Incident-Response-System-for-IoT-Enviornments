# 📑 Project Architecture & Data Contract
**Standardized for Team Synchronization**

To ensure all 4 members can work on different laptops, we will use the following **camelCase** naming conventions and data structures.

---

### **1. Tech Stack (Person 2: Backend)**
*   **Language:** Node.js
*   **Framework:** Express.js
*   **Real-time:** Socket.io
*   **Database:** MongoDB (using Mongoose)

---

### **2. Telemetry Schema (Person 1 ➔ Person 2 ➔ Person 3)**
Every packet sent by the IoT Simulator **MUST** follow this JSON structure:

```json
{
  "deviceId": "ESP32-001",
  "timestamp": "2024-03-05T22:50:00Z",
  "type": "heartbeat", 
  "data": {
    "cpuUsage": 12.5,
    "ramUsage": 45.2,
    "loginStatus": "SUCCESS", 
    "packetFrequency": 1,
    "authHeader": "Bearer eyJhbGci..."
  }
}
```
*   **`type` options:** `heartbeat`, `login`, `traffic_spike`.
*   **`loginStatus` options:** `SUCCESS`, `FAIL`.

---

### **3. Alert Payload (Person 3 ➔ Person 2 ➔ Person 4)**
When the "Brain" detects a threat, it will broadcast this structure to the Dashboard:

```json
{
  "alertId": "ALT-9982",
  "deviceId": "ESP32-001",
  "threatType": "Brute Force",
  "severity": "Critical",
  "timestamp": "2024-03-05T22:55:00Z",
  "details": "5 failed login attempts detected within 10 seconds.",
  "status": "Blocked"
}
```
*   **`threatType` options:** `Brute Force`, `DDoS`, `Unauthorized Access`.
*   **`severity` options:** `Low`, `Medium`, `High`, `Critical`.

---

### **4. Database Schema (Standard)**
*   **Device Collection:** `{ deviceId, name, type, status: ['Active', 'Blocked'], lastSeen }`
*   **Incident Collection:** `{ incidentId, deviceId, type, severity, timestamp }`
