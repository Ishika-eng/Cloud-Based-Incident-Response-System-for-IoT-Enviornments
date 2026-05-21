# Security Engine (Person 3 Guide)

As the **Security & Detection Engineer (Person 3)**, you are responsible for the `SecurityEngine.js` file. This is the "brain" of the system that analyzes incoming telemetry from IoT devices and decides if an attack is happening.

## 🏗️ Architecture Overview

The `SecurityEngine` is a JavaScript class designed to be a standalone, reusable intelligence module. It is imported by the backend routes and called every time a new piece of telemetry arrives.

### The Lifecycle of a Packet
1. **Ingest**: A device sends telemetry to `POST /api/telemetry`.
2. **Standardize**: The backend route parses the data into a standard object (CPU, Memory, Traffic, etc.).
3. **Analyze**: The route calls `analyzeTelemetry(telemetry, device)`.
4. **Report**: The engine returns an array of "Threats."
5. **Respond**: If threats exist, the backend saves them as "Incidents" and blocks the device if needed.

---

## 🔍 Core Logic & Detection Rules

The engine currently has four main detection modules inside the `analyzeTelemetry` function:

### 1. DDoS Detection
*   **Metric**: `traffic` (Packets per interval).
*   **Rule**: `IF traffic > ddos_threshold`.
*   **Logic**: If a single device starts sending packets faster than the defined threshold (default: 10), it is flagged as a potential DDoS attempt.

### 2. Brute Force Detection
*   **Metric**: `loginStatus`.
*   **Rule**: `IF loginStatus === 'FAIL' AND recent_failures >= threshold`.
*   **Logic**: 
    - Every time a login fails, it queries the `Incident` database using `countRecentFailures`.
    - It looks back at the last 10 seconds.
    - If it's a first failure, it logs a "Low" severity Unauthorized alert.
    - If failures exceed 5, it upgrades the threat to a "Critical" Brute Force attack.

### 3. Hardware Anomaly Detection
*   **Metric**: `cpu` and `memory`.
*   **Rule**: `IF cpu > 95 OR memory > 90`.
*   **Logic**: High resource utilization can indicate that a device has been compromised or is running a malicious script in the background.

### 4. Authentication Validation
*   **Metric**: `authHeader`.
*   **Logic**: A simple check to ensure that every packet includes a standard `Bearer <token>` header. If the format is wrong, it flags it as an "Unauthorized" access attempt.

---

## ⚙️ Configuration (Threat Thresholds)

You can tune the sensitivity of the engine in the `constructor`:

```javascript
this.threatThresholds = {
  ddos: 10,                 // Max packets allowed per interval
  bruteForceAttempts: 5,   // Number of failures before "Critical" alert
  bruteForceTimeWindow: 10000, // Lookback period (10 seconds)
  cpuThreshold: 95,         // Max safe CPU usage (%)
  memoryThreshold: 90       // Max safe RAM usage (%)
};
```

---

## 🛠️ Key Helper Methods

*   **`countRecentFailures(deviceId)`**: An async function that talks to MongoDB to see how many `Unauthorized` incidents were recorded for this device in the last 10 seconds.
*   **`getThreatSeverity(type)`**: Maps an attack name (like "DDoS") to a standard severity level (High, Critical, etc.).
*   **`generateAlert(...)`**: Formats the final alert object that will be displayed on the SOC Dashboard (Person 4).

---

## 🧪 Current Challenges
We recently updated the **Incident** model to use **UUIDs** because during a DDoS simulation, packets were arriving so fast that the random ID generator was creating duplicates, causing the server to crash. The UUID fix ensures the engine remains stable even during high-traffic attacks.
