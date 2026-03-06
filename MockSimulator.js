/**
 * MockSimulator.js
 * 
 * This script simulates an IoT device sending telemetry.
 * Use this to test your SecurityEngine logic on your own laptop!
 */

const SecurityEngine = require('./SecurityEngine');
const engine = new SecurityEngine();

// Helper: Sends a packet to the engine and logs any alerts
const sendPacket = (deviceId, type, loginStatus, authHeader) => {
    const telemetry = {
        deviceId,
        data: {
            type,
            loginStatus,
            authHeader,
            timestamp: new Date().toISOString()
        }
    };

    const alert = engine.analyzeTelemetry(telemetry);

    if (alert) {
        console.log(`\n🚨 [ALERT DETECTED] 🚨`);
        console.log(`Type: ${alert.threatType}`);
        console.log(`Severity: ${alert.severity}`);
        console.log(`Details: ${alert.details}`);
        console.log(`Status: ${alert.status}\n`);
    } else {
        console.log(`[Packet Ingested] Device: ${deviceId} | Status: ${loginStatus}`);
    }
};

// --- SCENARIO 1: Brute Force Attack ---
console.log("--- Starting Brute Force Simulation (6 Failed Attempts) ---");
for (let i = 1; i <= 6; i++) {
    sendPacket('ESP32-BF-TEST', 'login', 'FAIL', 'Bearer-Valid-Token');
}

// --- SCENARIO 2: DDoS Attack ---
console.log("\n--- Starting DDoS Simulation (25 Fast Packets) ---");
for (let i = 1; i <= 25; i++) {
    sendPacket('ESP32-DDOS-TEST', 'heartbeat', 'SUCCESS', 'Bearer-Valid-Token');
}

// --- SCENARIO 3: Normal Traffic ---
console.log("\n--- Starting Normal Simulation ---");
sendPacket('ESP32-NORMAL', 'heartbeat', 'SUCCESS', 'Bearer-Valid-Token');

// --- SCENARIO 4: Unauthorized Access ---
console.log("\n--- Starting Unauthorized Access Simulation ---");
console.log("Testing with missing token:");
sendPacket('ESP32-AUTH-TEST', 'heartbeat', 'SUCCESS', null); // Missing header

console.log("\nTesting with expired token:");
sendPacket('ESP32-AUTH-TEST', 'heartbeat', 'SUCCESS', 'EXPIRED'); // Expired header
