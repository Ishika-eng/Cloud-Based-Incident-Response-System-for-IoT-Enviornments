const Incident = require('./models/Incident');
const { mlDetector } = require('./MLAnomalyDetector');

// ─────────────────────────────────────────────────────────────────────────────
// Module-level cache — shared across all SecurityEngine instances.
// Persists for the lifetime of the server process.
// Stores per-device state: failedLogins, last temperature, and baselines.
// ─────────────────────────────────────────────────────────────────────────────
const deviceStateCache = new Map();

// Number of packets needed before the adaptive baseline is considered reliable.
// During calibration the system falls back to static thresholds.
const CALIBRATION_SAMPLES = 20;

class SecurityEngine {
  constructor() {
    this.threatThresholds = {
      // Static fallback thresholds (used only while a device is still calibrating)
      ddos:                 10,
      bruteForceAttempts:   5,
      bruteForceTimeWindow: 10000, // ms
      cpuThreshold:         95,
      memoryThreshold:      90,
      maxTemp:              80,
      minTemp:              -10,
      maxDeltaTemp:         15,    // max °C change between consecutive packets
      validRoles:           ['device', 'gateway', 'admin']
    };

    this.deviceStateCache = deviceStateCache;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Adaptive Baseline Helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update the rolling baseline for a single metric and return an anomaly verdict.
   *
   * Phase 1 — Calibrating (first CALIBRATION_SAMPLES packets):
   *   Collects samples, computes mean + stdDev when ready, returns calibrated=false.
   *
   * Phase 2 — Calibrated:
   *   Computes z-score against the learned baseline.
   *   Flags as anomaly if z-score > 3  (i.e. 3 standard deviations above normal).
   *   Slowly drifts the baseline with EMA (α=0.02) so legitimate long-term
   *   changes (e.g. summer heat) are absorbed without masking real attacks.
   *
   * @param {object} state  - The device's full state object from deviceStateCache
   * @param {string} metric - e.g. 'traffic', 'cpu', 'memory', 'temperature'
   * @param {number} value  - The raw telemetry value for this metric
   * @returns {{ calibrated: boolean, zScore: number, isAnomaly: boolean }}
   */
  _updateBaseline(state, metric, value) {
    if (!state.baselines) state.baselines = {};
    if (!state.baselines[metric]) {
      state.baselines[metric] = {
        samples:    [],
        mean:       null,
        stdDev:     null,
        calibrated: false
      };
    }

    const b = state.baselines[metric];

    // ── Phase 1: Calibrating ─────────────────────────────────────────────
    if (!b.calibrated) {
      b.samples.push(value);

      if (b.samples.length >= CALIBRATION_SAMPLES) {
        // Compute initial mean
        b.mean = b.samples.reduce((sum, v) => sum + v, 0) / b.samples.length;

        // Compute initial standard deviation
        const variance = b.samples.reduce((sum, v) => sum + Math.pow(v - b.mean, 2), 0) / b.samples.length;
        // Floor at 0.5 so we never divide by ~zero for very stable devices
        b.stdDev = Math.max(0.5, Math.sqrt(variance));

        b.calibrated = true;
        b.samples    = []; // Free memory — no longer needed
        console.log(`[EMA] Baseline calibrated for metric="${metric}": mean=${b.mean.toFixed(2)}, stdDev=${b.stdDev.toFixed(2)}, threshold=${(b.mean + 3*b.stdDev).toFixed(2)}`);
      } else if (b.samples.length === 1 || b.samples.length % 5 === 0) {
        // Log only at start and every 5 samples to reduce noise
        console.log(`[EMA] Calibrating metric="${metric}": ${b.samples.length}/${CALIBRATION_SAMPLES} samples`);
      }

      return { calibrated: false, zScore: 0, isAnomaly: false };
    }

    // ── Phase 2: Calibrated — compute z-score BEFORE updating baseline ───
    const zScore = (value - b.mean) / b.stdDev;

    // Slow EMA update (α=0.02 ≈ adapts over ~50 packets).
    // Keeps baseline accurate for legitimate long-term drift but
    // prevents a sustained attack from "training" the baseline upward.
    const alpha = 0.02;
    b.mean   = b.mean   * (1 - alpha) + value   * alpha;
    b.stdDev = Math.max(0.5, b.stdDev * (1 - alpha) + Math.abs(value - b.mean) * alpha);

    if (zScore > 2) {
      console.log(`[EMA] metric="${metric}" value=${value}, zScore=${zScore.toFixed(2)}, mean=${b.mean.toFixed(2)}, stdDev=${b.stdDev.toFixed(2)}, ANOMALY=${zScore > 3}`);
    }

    return {
      calibrated: true,
      zScore,
      isAnomaly: zScore > 3   // Only positive spikes are threats for these metrics
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Main Analysis Entry Point
  // ───────────────────────────────────────────────────────────────────────────

  async analyzeTelemetry(telemetry, device) {
    const threats = [];
    const {
      cpu, memory, loginStatus, traffic,
      authHeader, sensorData, deviceId: providedId
    } = telemetry;

    // Determine the cache key and load the FULL unified state for this device.
    const deviceKey = device ? device._id.toString() : (providedId || null);
    const state     = deviceKey ? (this.deviceStateCache.get(deviceKey) || {}) : {};

    // ── 1. Rogue Device Detection (Identity Check) ───────────────────────
    // Accept either the device UUID or the device name as valid identity
    if (providedId && device) {
      const validIds = [device._id.toString(), device.name];
      if (!validIds.includes(providedId)) {
        threats.push({
          type:     'Rogue Device',
          severity: 'Critical',
          details:  `Identity mismatch: Provided ID "${providedId}" does not match registered device "${device.name}" (${device._id})`
        });
      }
    }

    // ── 2. DDoS Detection (Adaptive) ────────────────────────────────────
    if (traffic !== undefined) {
      const result = this._updateBaseline(state, 'traffic', traffic);

      if (result.calibrated) {
        if (result.isAnomaly) {
          threats.push({
            type:     'DDoS',
            severity: 'High',
            details:  `Adaptive DDoS: Traffic ${traffic} pkt/s is ${result.zScore.toFixed(1)}σ above this device's learned baseline (mean: ${state.baselines.traffic.mean.toFixed(1)} pkt/s)`
          });
        }
      } else {
        // Still calibrating — collect samples silently.
        // No alerts during calibration to avoid false positives on new devices.
      }
    }

    // ── 3. Brute Force Detection ─────────────────────────────────────────
    if (loginStatus === 'FAIL' && device) {
      state.failedLogins = (state.failedLogins || 0) + 1;

      if (state.failedLogins >= this.threatThresholds.bruteForceAttempts) {
        threats.push({
          type:     'Brute Force',
          severity: 'Critical',
          details:  `${state.failedLogins} failed login attempts detected.`
        });
        state.failedLogins = 0; // Reset to avoid repeated critical alerts
      }
    } else if (telemetry.type === 'login' && loginStatus === 'SUCCESS' && device) {
      state.failedLogins = 0;
    }

    // ── 4. Sensor Data Manipulation ──────────────────────────────────────
    if (sensorData && sensorData.temperature !== undefined) {
      const temp = sensorData.temperature;

      // 4a. Static range check — catches physically impossible values
      if (temp > this.threatThresholds.maxTemp || temp < this.threatThresholds.minTemp) {
        threats.push({
          type:     'Anomaly',
          severity: 'High',
          details:  `Sensor Manipulation: Out-of-range temperature detected (${temp}°C). Valid range: ${this.threatThresholds.minTemp}°C – ${this.threatThresholds.maxTemp}°C`
        });
      }

      // 4b. Delta check — catches impossible rate of change between packets
      if (state.temperature !== undefined) {
        const delta = Math.abs(temp - state.temperature);
        if (delta > this.threatThresholds.maxDeltaTemp) {
          threats.push({
            type:     'Anomaly',
            severity: 'Medium',
            details:  `Sensor Manipulation: Impossible temperature jump of ${delta.toFixed(1)}°C detected (${state.temperature}°C → ${temp}°C).`
          });
        }
      }

      // 4c. Adaptive baseline check — catches subtle sensor drift/spoofing
      //     that static range and delta checks would miss.
      //     Example: a server-room sensor normally at 55°C suddenly reads 72°C.
      //     That is within the static max of 80°C, but 3σ above its own baseline.
      const tempResult = this._updateBaseline(state, 'temperature', temp);
      if (tempResult.calibrated && tempResult.isAnomaly) {
        const alreadyCaughtByRange = temp > this.threatThresholds.maxTemp || temp < this.threatThresholds.minTemp;
        if (!alreadyCaughtByRange) {
          threats.push({
            type:     'Anomaly',
            severity: 'Medium',
            details:  `Adaptive Sensor Anomaly: Temperature ${temp}°C is ${tempResult.zScore.toFixed(1)}σ above this sensor's learned normal (mean: ${state.baselines.temperature.mean.toFixed(1)}°C)`
          });
        }
      }

      // Always update last known temperature in unified state
      state.temperature     = temp;
      state.tempTimestamp   = Date.now();
    }

    // ── 5. Unauthorized Access Attempt (Auth Header / Role Check) ────────
    if (authHeader) {
      const validation = this.validateAuthHeader(authHeader);
      if (!validation.valid) {
        threats.push({
          type:     'Unauthorized',
          severity: 'Medium',
          details:  `Unauthorized Access: ${validation.error}`
        });
      }
    }

    // ── 6. Hardware Anomaly Detection (Adaptive) ─────────────────────────
    //
    // KEY INSIGHT:
    //   EDGE-COMPUTE-NODE runs normally at ~70% CPU.
    //   Static threshold (95%) would never catch a cryptominer at 85%.
    //   Adaptive threshold (70 + 3*10 = 100%) — ok, CPU is a hard cap.
    //   BUT for a TEMP-SENSOR (normal: 8% CPU), adaptive catches 25% CPU
    //   immediately (z = (25-8)/2 = 8.5σ) — static threshold of 95% misses it entirely.

    if (cpu !== undefined) {
      const cpuResult = this._updateBaseline(state, 'cpu', cpu);

      if (cpuResult.calibrated) {
        if (cpuResult.isAnomaly) {
          threats.push({
            type:     'Anomaly',
            severity: 'Medium',
            details:  `Adaptive CPU Anomaly: ${cpu}% is ${cpuResult.zScore.toFixed(1)}σ above this device's learned normal usage (baseline mean: ${state.baselines.cpu.mean.toFixed(1)}%)`
          });
        }
      } else {
        // Still calibrating — collect samples silently.
      }
    }

    if (memory !== undefined) {
      const memResult = this._updateBaseline(state, 'memory', memory);

      if (memResult.calibrated) {
        if (memResult.isAnomaly) {
          threats.push({
            type:     'Anomaly',
            severity: 'Low',
            details:  `Adaptive Memory Anomaly: ${memory}% is ${memResult.zScore.toFixed(1)}σ above this device's learned normal usage (baseline mean: ${state.baselines.memory.mean.toFixed(1)}%)`
          });
        }
      } else {
        // Still calibrating — collect samples silently.
      }
    }

    // ── 7. ML Isolation Forest — Multivariate Anomaly Detection ─────────
    // Runs AFTER all individual checks. Catches slow-burn attacks and
    // unusual metric *combinations* that z-score misses (e.g. cpu=50%
    // looks normal alone, but cpu=50% + traffic=8000 + memory=88% together
    // is statistically impossible for this device's normal behaviour).
    if (deviceKey) {
      const mlResult = mlDetector.analyze(deviceKey, telemetry);

      if (mlResult.phase === 'calibrating') {
        // Silent — log only milestones
        if (mlResult.samplesCollected === 1 || mlResult.samplesCollected % 10 === 0) {
          console.log(`[ML] Device ${deviceKey} calibrating: ${mlResult.samplesCollected}/${mlResult.samplesNeeded} samples`);
        }
      } else if (mlResult.phase === 'calibrated' && mlResult.isAnomaly) {
        // Only raise ML alert if z-score checks didn't already catch it
        // (avoids duplicate alerts for the same event)
        const alreadyCaught = threats.some(t =>
          t.type === 'DDoS' || t.type === 'Anomaly'
        );

        if (!alreadyCaught) {
          threats.push({
            type:     'Anomaly',
            severity: 'High',
            details:  `ML Isolation Forest: Multivariate anomaly detected (score=${mlResult.score}). ` +
                      `Unusual combination of metrics: ${JSON.stringify(mlResult.features)}. ` +
                      `This pattern is statistically impossible given this device's learned behaviour.`
          });
        }
      }
    }

    // ── Persist the unified state back to the module-level cache ─────────
    if (deviceKey) this.deviceStateCache.set(deviceKey, state);

    return threats;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ───────────────────────────────────────────────────────────────────────────

  async countRecentFailures(deviceId) {
    if (!deviceId) return 0;
    const timeWindow = new Date(Date.now() - this.threatThresholds.bruteForceTimeWindow);

    const count = await Incident.countDocuments({
      deviceId:  deviceId,
      type:      'Brute Force',
      timestamp: { $gte: timeWindow }
    });

    return count;
  }

  validateAuthHeader(authHeader) {
    if (!authHeader) {
      return { valid: false, error: 'Missing authentication header' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Invalid authentication header format' };
    }

    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      return { valid: false, error: 'Invalid token length' };
    }

    if (token.includes('rogue')) {
      return { valid: false, error: 'Token contains unauthorized role/metadata' };
    }

    return { valid: true };
  }

  getThreatSeverity(threatType) {
    const severityMap = {
      'DDoS':         'High',
      'Brute Force':  'Critical',
      'Rogue Device': 'Critical',
      'Anomaly':      'High',
      'Unauthorized': 'Medium',
      'Unknown':      'Low'
    };
    return severityMap[threatType] || 'Low';
  }

  generateAlert(incident, device) {
    return {
      alertId:    incident.incidentId,
      deviceId:   device._id,
      threatType: incident.type,
      severity:   incident.severity,
      timestamp:  incident.timestamp,
      details:    incident.type,
      status:     'Blocked'
    };
  }

  /**
   * Returns the current baseline status for a device.
   * Useful for debugging and for the dashboard to show calibration progress.
   */
  getBaselineStatus(deviceId) {
    const state = this.deviceStateCache.get(deviceId);
    if (!state || !state.baselines) {
      return { status: 'No data yet', baselines: {} };
    }

    const result = {};
    for (const [metric, b] of Object.entries(state.baselines)) {
      result[metric] = b.calibrated
        ? { calibrated: true,  mean: b.mean.toFixed(2), stdDev: b.stdDev.toFixed(2), threshold: (b.mean + 3 * b.stdDev).toFixed(2) }
        : { calibrated: false, samplesCollected: b.samples.length, samplesNeeded: CALIBRATION_SAMPLES };
    }

    return { status: 'ok', baselines: result };
  }
}

module.exports = SecurityEngine;
