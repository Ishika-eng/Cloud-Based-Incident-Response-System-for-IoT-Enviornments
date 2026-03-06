/**
 * SecurityEngine.js
 * 
 * This is the "Brain" of the Incident Response System.
 * It monitors incoming telemetry and identifies security threats.
 */

class SecurityEngine {
    constructor() {
        // We use a Map to keep track of device-specific data in memory.
        // This is much faster than querying a database for every single packet.
        this.sessions = new Map();

        // Configuration thresholds
        this.BRUTE_FORCE_THRESHOLD = 5; // Max allowed failures
        this.WINDOW_MS = 10000;         // Time window (10 seconds)
    }

    /**
     * analyzeTelemetry
     * The main entry point for processing data from Person 1 (Simulator).
     */
    analyzeTelemetry(telemetry) {
        const { deviceId, data } = telemetry;
        const { loginStatus } = data;

        // 1. Initialize session if it doesn't exist
        if (!this.sessions.has(deviceId)) {
            this.sessions.set(deviceId, {
                loginFailures: [],
                packetTimestamps: []
            });
        }

        const session = this.sessions.get(deviceId);
        const now = Date.now();

        // 2. BRUTE FORCE DETECTION LOGIC
        if (loginStatus === 'FAIL') {
            session.loginFailures.push(now);
            session.loginFailures = session.loginFailures.filter(
                timestamp => (now - timestamp) <= this.WINDOW_MS
            );

            if (session.loginFailures.length >= this.BRUTE_FORCE_THRESHOLD) {
                return this.triggerAlert(deviceId, 'Brute Force', 'Critical',
                    `${session.loginFailures.length} failed login attempts in ${this.WINDOW_MS / 1000}s.`);
            }
        }

        // 3. DDoS / ANOMALY DETECTION LOGIC
        // We track the time of every packet (including heartbeats)
        session.packetTimestamps.push(now);

        // Keep only the last 10 seconds of packets
        session.packetTimestamps = session.packetTimestamps.filter(
            timestamp => (now - timestamp) <= this.WINDOW_MS
        );

        // If a device sends more than 20 packets in 10 seconds, it's a "Spike"
        if (session.packetTimestamps.length > 20) {
            return this.triggerAlert(deviceId, 'DDoS', 'High',
                `High traffic detected: ${session.packetTimestamps.length} packets in ${this.WINDOW_MS / 1000}s.`);
        }

        return null; // No threat detected
    }

    /**
     * triggerAlert
     * Standardizes the alert format based on our api_contract.md
     */
    triggerAlert(deviceId, threatType, severity, details) {
        return {
            alertId: `ALT-${Math.floor(Math.random() * 10000)}`,
            deviceId,
            threatType,
            severity,
            timestamp: new Date().toISOString(),
            details,
            status: 'Blocked'
        };
    }
}

// Export the class so it can be used in other files
module.exports = SecurityEngine;
