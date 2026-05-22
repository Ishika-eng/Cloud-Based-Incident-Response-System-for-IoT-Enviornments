/**
 * CorrelationEngine — Cross-Device Attack Pattern Detection
 *
 * What it does:
 *   Every time a device receives a threat, this engine asks:
 *   "Did OTHER devices see something similar recently?"
 *
 *   If yes → it's a coordinated/multi-device attack, not an isolated incident.
 *
 * Patterns detected:
 *   1. Coordinated DDoS      — 2+ devices hit with DDoS within 30s
 *   2. Lateral Movement      — Brute Force on Device A → traffic spike on Device B within 60s
 *   3. Network Sweep         — 3+ devices all see traffic anomaly within 20s (attacker scanning)
 *   4. Synchronized BruteForce — 2+ devices get login failures within 15s (credential stuffing)
 *
 * Why this is novel:
 *   Every basic IoT security system monitors devices in isolation.
 *   This engine sees the NETWORK as a whole — an attacker who compromises
 *   one device and moves laterally is invisible to per-device analysis.
 */

const TIME_WINDOWS = {
  COORDINATED_DDOS:       30_000,  // ms — 30 seconds
  LATERAL_MOVEMENT:       60_000,  // ms — 60 seconds
  NETWORK_SWEEP:          20_000,  // ms — 20 seconds
  SYNC_BRUTE_FORCE:       15_000,  // ms — 15 seconds
};

const MIN_DEVICES = {
  COORDINATED_DDOS:    2,
  NETWORK_SWEEP:       3,
  SYNC_BRUTE_FORCE:    2,
};

class CorrelationEngine {
  constructor() {
    // Sliding window event log: [ { deviceId, deviceName, threatType, timestamp } ]
    this.eventLog = [];

    // Track last correlated alert per pattern to avoid flooding
    // pattern_key → timestamp of last alert
    this.lastAlertTime = new Map();
    this.ALERT_COOLDOWN = 30_000; // don't re-alert same pattern within 30s
  }

  /**
   * Call this after the SecurityEngine finishes analyzing a device.
   *
   * @param {object} device   - The device document from MongoDB
   * @param {Array}  threats  - Threats returned by SecurityEngine for this packet
   * @returns {Array}         - Array of correlated threat objects (may be empty)
   */
  analyze(device, threats) {
    const now = Date.now();

    // 1. Add each new threat to the sliding window log
    for (const threat of threats) {
      this.eventLog.push({
        deviceId:   String(device._id),
        deviceName: device.name,
        threatType: threat.type,
        severity:   threat.severity,
        timestamp:  now,
      });
    }

    // 2. Prune events older than the longest window (60s)
    const cutoff = now - 60_000;
    this.eventLog = this.eventLog.filter(e => e.timestamp >= cutoff);

    // 3. Run pattern detectors
    const correlated = [];

    correlated.push(...this._detectCoordinatedDDoS(now));
    correlated.push(...this._detectLateralMovement(now));
    correlated.push(...this._detectNetworkSweep(now));
    correlated.push(...this._detectSyncBruteForce(now));

    return correlated;
  }

  // ── Pattern 1: Coordinated DDoS ──────────────────────────────────────────────
  // 2+ distinct devices hit with DDoS within 30 seconds
  _detectCoordinatedDDoS(now) {
    const window   = now - TIME_WINDOWS.COORDINATED_DDOS;
    const ddosHits = this.eventLog.filter(
      e => e.threatType === 'DDoS' && e.timestamp >= window
    );

    const devices = [...new Set(ddosHits.map(e => e.deviceId))];
    if (devices.length < MIN_DEVICES.COORDINATED_DDOS) return [];

    const key = 'coordinated_ddos';
    if (this._onCooldown(key, now)) return [];
    this.lastAlertTime.set(key, now);

    const names = [...new Set(ddosHits.map(e => e.deviceName))].join(', ');
    return [{
      type:        'Coordinated Attack',
      severity:    'Critical',
      details:     `Coordinated DDoS detected across ${devices.length} devices simultaneously: [${names}]. ` +
                   `All hit within ${TIME_WINDOWS.COORDINATED_DDOS / 1000}s — indicates a botnet or orchestrated attack, not an isolated incident.`,
      correlation: { pattern: 'coordinated_ddos', devicesInvolved: devices, deviceNames: names.split(', ') },
    }];
  }

  // ── Pattern 2: Lateral Movement ──────────────────────────────────────────────
  // Brute Force on one device → within 60s → DDoS or Anomaly on a DIFFERENT device
  // Classic attacker pattern: compromise entry point → move to next target
  _detectLateralMovement(now) {
    const window      = now - TIME_WINDOWS.LATERAL_MOVEMENT;
    const bruteEvents = this.eventLog.filter(
      e => e.threatType === 'Brute Force' && e.timestamp >= window
    );
    const followEvents = this.eventLog.filter(
      e => (e.threatType === 'DDoS' || e.threatType === 'Anomaly' || e.threatType === 'Unauthorized') &&
           e.timestamp >= window
    );

    // Find pairs where brute force device ≠ follow-up device
    for (const brute of bruteEvents) {
      for (const follow of followEvents) {
        if (follow.deviceId === brute.deviceId) continue;        // same device — not lateral
        if (follow.timestamp < brute.timestamp) continue;        // follow-up must be AFTER brute force

        const key = `lateral_${brute.deviceId}_${follow.deviceId}`;
        if (this._onCooldown(key, now)) continue;
        this.lastAlertTime.set(key, now);

        const deltaSeconds = ((follow.timestamp - brute.timestamp) / 1000).toFixed(1);
        return [{
          type:        'Lateral Movement',
          severity:    'Critical',
          details:     `Lateral movement detected: Brute Force on "${brute.deviceName}" ` +
                       `followed by ${follow.threatType} on "${follow.deviceName}" ${deltaSeconds}s later. ` +
                       `Attacker likely compromised ${brute.deviceName} and pivoted to ${follow.deviceName}.`,
          correlation: {
            pattern:      'lateral_movement',
            sourceDevice: brute.deviceId,
            targetDevice: follow.deviceId,
            deltaSeconds: parseFloat(deltaSeconds),
          },
        }];
      }
    }
    return [];
  }

  // ── Pattern 3: Network Sweep ─────────────────────────────────────────────────
  // 3+ devices all see DDoS or Anomaly within 20s — attacker scanning the whole network
  _detectNetworkSweep(now) {
    const window      = now - TIME_WINDOWS.NETWORK_SWEEP;
    const sweepEvents = this.eventLog.filter(
      e => (e.threatType === 'DDoS' || e.threatType === 'Anomaly') &&
           e.timestamp >= window
    );

    const devices = [...new Set(sweepEvents.map(e => e.deviceId))];
    if (devices.length < MIN_DEVICES.NETWORK_SWEEP) return [];

    const key = 'network_sweep';
    if (this._onCooldown(key, now)) return [];
    this.lastAlertTime.set(key, now);

    const names = [...new Set(sweepEvents.map(e => e.deviceName))].join(', ');
    return [{
      type:        'Network Sweep',
      severity:    'Critical',
      details:     `Network-wide sweep detected: ${devices.length} devices [${names}] ` +
                   `all triggered anomalies within ${TIME_WINDOWS.NETWORK_SWEEP / 1000}s. ` +
                   `This is consistent with a network scanner or worm propagating across the IoT environment.`,
      correlation: { pattern: 'network_sweep', devicesInvolved: devices, deviceNames: names.split(', ') },
    }];
  }

  // ── Pattern 4: Synchronized Brute Force ──────────────────────────────────────
  // 2+ devices hit with Brute Force within 15s — credential stuffing attack
  _detectSyncBruteForce(now) {
    const window      = now - TIME_WINDOWS.SYNC_BRUTE_FORCE;
    const bruteEvents = this.eventLog.filter(
      e => e.threatType === 'Brute Force' && e.timestamp >= window
    );

    const devices = [...new Set(bruteEvents.map(e => e.deviceId))];
    if (devices.length < MIN_DEVICES.SYNC_BRUTE_FORCE) return [];

    const key = 'sync_brute_force';
    if (this._onCooldown(key, now)) return [];
    this.lastAlertTime.set(key, now);

    const names = [...new Set(bruteEvents.map(e => e.deviceName))].join(', ');
    return [{
      type:        'Coordinated Attack',
      severity:    'Critical',
      details:     `Synchronized credential attack: Brute Force on ${devices.length} devices [${names}] ` +
                   `within ${TIME_WINDOWS.SYNC_BRUTE_FORCE / 1000}s. ` +
                   `Consistent with automated credential stuffing — attacker is testing the same stolen passwords across all devices.`,
      correlation: { pattern: 'sync_brute_force', devicesInvolved: devices, deviceNames: names.split(', ') },
    }];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  _onCooldown(key, now) {
    const last = this.lastAlertTime.get(key);
    return last && (now - last) < this.ALERT_COOLDOWN;
  }

  /** Returns current event log — for /debug/correlation endpoint */
  getStatus() {
    const now = Date.now();
    return {
      eventsInWindow:  this.eventLog.length,
      windowSeconds:   60,
      recentEvents:    this.eventLog.slice(-20).map(e => ({
        deviceName: e.deviceName,
        threatType: e.threatType,
        secondsAgo: Math.round((now - e.timestamp) / 1000),
      })),
    };
  }
}

// Singleton — shared across all requests
const correlationEngine = new CorrelationEngine();
module.exports = { CorrelationEngine, correlationEngine };
