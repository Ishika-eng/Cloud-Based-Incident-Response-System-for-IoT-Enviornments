/**
 * MockSimulator.js
 * 
 * This script simulates an IoT device sending telemetry.
 * Use this to test your SecurityEngine logic on your own laptop!
 */

const SecurityEngine = require('./iot-backend/SecurityEngine');
const engine = new SecurityEngine();

// -- MOCKING DATABASE FOR LOCAL TEST --
// Since we don't want to connect to a real MongoDB for this test, 
// we override the countRecentFailures method to return a simulated value.
let mockFailures = 0;
engine.countRecentFailures = async (deviceId) => {
    return mockFailures;
};

const TEST_DEVICE = { _id: "LEGIT-DEVICE-001" };

// Helper: Sends a packet to the engine and logs any alerts
const sendPacket = async (deviceId, type, loginStatus, authHeader, options = {}) => {
    // Standardized format as expected by SecurityEngine
    const telemetry = {
        deviceId,
        timestamp: new Date().toISOString(),
        type: type,
        cpu: options.cpuUsage || 10,
        memory: options.ramUsage || 30,
        traffic: options.packetFrequency || 1,
        loginStatus: loginStatus,
        authHeader: authHeader,
        sensorData: options.temperature ? { temperature: options.temperature } : (options.sensorData || {})
    };

    const threats = await engine.analyzeTelemetry(telemetry, TEST_DEVICE);

    if (threats && threats.length > 0) {
        threats.forEach(threat => {
            console.log(`\n🚨 [ALERT DETECTED] 🚨`);
            console.log(`Type: ${threat.type}`);
            console.log(`Severity: ${threat.severity}`);
            console.log(`Details: ${threat.details}`);
        });
    } else {
        console.log(`[Packet Ingested] Device: ${deviceId} | Status: ${loginStatus || 'OK'}`);
    }
};

// --- EXECUTE SCENARIOS ---
(async () => {
    // --- SCENARIO 1: Brute Force Attack ---
    console.log("--- Starting Brute Force Simulation (6 Failed Attempts) ---");
    for (let i = 1; i <= 6; i++) {
        mockFailures = i - 1; // Simulate incrementing failure count in DB
        await sendPacket('ESP32-BF-TEST', 'login', 'FAIL', 'Bearer Valid-Token');
    }

    // --- SCENARIO 2: DDoS Attack ---
    console.log("\n--- Starting DDoS Simulation (Frequent Packets) ---");
    await sendPacket('ESP32-DDOS-TEST', 'traffic_spike', 'SUCCESS', 'Bearer Valid-Token', { cpuUsage: 10, packetFrequency: 50 });

    // --- SCENARIO 3: Normal Traffic ---
    console.log("\n--- Starting Normal Simulation ---");
    mockFailures = 0;
    await sendPacket('ESP32-NORMAL', 'heartbeat', 'SUCCESS', 'Bearer Valid-Token');

    // --- SCENARIO 4: Rogue Device Simulation ---
    console.log("\n--- Starting Rogue Device Simulation (Identity Mismatch) ---");
    const telemetryRogue = {
        deviceId: 'ROGUE-ID-999',
        data: {
            type: 'heartbeat',
            loginStatus: 'SUCCESS',
            authHeader: 'Bearer Valid-Token',
            timestamp: new Date().toISOString()
        }
    };
    const threatsRogue = await engine.analyzeTelemetry(telemetryRogue, TEST_DEVICE);
    console.log(`Alert Detected: ${threatsRogue.length > 0 ? threatsRogue[0].type : 'None'}`);

    // --- SCENARIO 5: Sensor Manipulation (Out of Range) ---
    console.log("\n--- Starting Sensor Manipulation (Temperature 500°C) ---");
    await sendPacket('LEGIT-DEVICE-001', 'heartbeat', 'SUCCESS', 'Bearer Valid-Token', { temperature: 500 });

    // --- SCENARIO 6: Unauthorized Access (Role Check) ---
    console.log("\n--- Starting Unauthorized Access (Rogue Token) ---");
    await sendPacket('LEGIT-DEVICE-001', 'heartbeat', 'SUCCESS', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.rogue_user.sig');
})();
