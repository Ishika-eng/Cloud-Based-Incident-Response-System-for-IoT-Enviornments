const axios = require("axios");

// Configuration
const BASE_URL = process.env.BACKEND_URL || "http://localhost:5001/api";
const TELEMETRY_URL = `${BASE_URL}/telemetry`;
const REGISTER_URL  = `${BASE_URL}/auth/register`;

// ─────────────────────────────────────────────────────────────────────────────
// Gaussian Random Helper (Box-Muller transform)
// Generates a realistic random value with a given mean and standard deviation.
// This makes each device behave like a real physical device with natural variance.
// ─────────────────────────────────────────────────────────────────────────────
function gaussianRandom(mean, std) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * std;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ─────────────────────────────────────────────────────────────────────────────
// 20 IoT Device Configurations
// Each device has a UNIQUE behavioral profile based on its real-world role.
// cpuMean/Std   — normal CPU load for this device type
// ramMean/Std   — normal RAM usage for this device type
// tempMean/Std  — normal operating temperature for this device's location
// trafficMean/Std — normal packets-per-second for this device
//
// WHY THIS MATTERS:
//   A simple temperature sensor runs at ~8% CPU naturally.
//   An edge compute node runs at ~70% CPU naturally.
//   With static thresholds (cpu > 95%), the compute node's spike to 85%
//   is MISSED. With adaptive baselines, it's caught immediately.
// ─────────────────────────────────────────────────────────────────────────────
const deviceConfigs = [
    // ── Sensors (low power, minimal traffic) ──────────────────────────────
    {
        name: "TEMP-SENSOR-1",
        type: "sensor",
        location: "Warehouse A",
        profile: { cpuMean: 8,  cpuStd: 2,  ramMean: 30, ramStd: 3,  tempMean: 23, tempStd: 1.5, trafficMean: 1,  trafficStd: 0.3 }
    },
    {
        name: "HUMIDITY-SENSOR-1",
        type: "sensor",
        location: "Warehouse A",
        profile: { cpuMean: 7,  cpuStd: 1.5,ramMean: 28, ramStd: 2,  tempMean: 22, tempStd: 1.2, trafficMean: 1,  trafficStd: 0.2 }
    },
    {
        name: "GAS-SENSOR-1",
        type: "sensor",
        location: "Kitchen",
        profile: { cpuMean: 11, cpuStd: 2,  ramMean: 33, ramStd: 3,  tempMean: 35, tempStd: 2.5, trafficMean: 2,  trafficStd: 0.4 }
    },
    {
        name: "LIGHT-SENSOR-1",
        type: "sensor",
        location: "Parking Lot",
        profile: { cpuMean: 6,  cpuStd: 1,  ramMean: 25, ramStd: 2,  tempMean: 28, tempStd: 3.0, trafficMean: 1,  trafficStd: 0.2 }
    },
    {
        name: "AIR-QUALITY-SENSOR-1",
        type: "sensor",
        location: "Loading Dock",
        profile: { cpuMean: 9,  cpuStd: 2,  ramMean: 31, ramStd: 3,  tempMean: 26, tempStd: 2.0, trafficMean: 1,  trafficStd: 0.3 }
    },

    // ── Actuators (moderate power, event-driven traffic) ──────────────────
    {
        name: "SMART-DOOR-LOCK",
        type: "actuator",
        location: "Main Office",
        profile: { cpuMean: 15, cpuStd: 4,  ramMean: 40, ramStd: 5,  tempMean: 21, tempStd: 1.0, trafficMean: 3,  trafficStd: 1.0 }
    },
    {
        name: "MOTION-SENSOR",
        type: "sensor",
        location: "Server Room",
        profile: { cpuMean: 5,  cpuStd: 1,  ramMean: 22, ramStd: 2,  tempMean: 20, tempStd: 1.0, trafficMean: 1,  trafficStd: 0.2 }
    },
    {
        name: "SECURITY-ALARM",
        type: "actuator",
        location: "Whole Facility",
        profile: { cpuMean: 12, cpuStd: 3,  ramMean: 36, ramStd: 4,  tempMean: 22, tempStd: 1.5, trafficMean: 2,  trafficStd: 0.5 }
    },
    {
        name: "SMART-FAN-CONTROLLER",
        type: "actuator",
        location: "Floor 1",
        profile: { cpuMean: 22, cpuStd: 5,  ramMean: 48, ramStd: 6,  tempMean: 32, tempStd: 3.0, trafficMean: 3,  trafficStd: 0.8 }
    },
    {
        name: "SMART-RELAY-SWITCH",
        type: "actuator",
        location: "Power Room",
        profile: { cpuMean: 14, cpuStd: 3,  ramMean: 38, ramStd: 4,  tempMean: 29, tempStd: 2.0, trafficMean: 2,  trafficStd: 0.5 }
    },

    // ── Gateways (higher load, heavier traffic) ───────────────────────────
    {
        name: "RFID-ACCESS-READER",
        type: "gateway",
        location: "Main Entrance",
        profile: { cpuMean: 20, cpuStd: 5,  ramMean: 45, ramStd: 6,  tempMean: 25, tempStd: 2.0, trafficMean: 5,  trafficStd: 1.5 }
    },
    {
        name: "SMART-LIGHT-CONTROLLER",
        type: "gateway",
        location: "Floor 1",
        profile: { cpuMean: 18, cpuStd: 4,  ramMean: 42, ramStd: 5,  tempMean: 30, tempStd: 2.5, trafficMean: 4,  trafficStd: 1.0 }
    },
    {
        name: "POWER-MONITOR",
        type: "sensor",
        location: "Power Room",
        profile: { cpuMean: 25, cpuStd: 6,  ramMean: 50, ramStd: 6,  tempMean: 40, tempStd: 4.0, trafficMean: 5,  trafficStd: 1.5 }
    },
    {
        name: "IOT-GATEWAY",
        type: "gateway",
        location: "Edge Node",
        profile: { cpuMean: 45, cpuStd: 9,  ramMean: 60, ramStd: 7,  tempMean: 50, tempStd: 4.5, trafficMean: 8,  trafficStd: 2.0 }
    },
    {
        name: "NETWORK-MONITOR",
        type: "gateway",
        location: "Server Room",
        // Normally handles ~9 pkt/s — static threshold of 10 causes constant false alarms!
        // Adaptive baseline learns its real normal and only alerts on true spikes.
        profile: { cpuMean: 50, cpuStd: 9,  ramMean: 65, ramStd: 7,  tempMean: 55, tempStd: 5.0, trafficMean: 9,  trafficStd: 2.0 }
    },
    {
        name: "EDGE-COMPUTE-NODE",
        type: "gateway",
        location: "Edge Node",
        // Normally at 70% CPU — static 95% threshold would MISS a cryptominer at 85%.
        // Adaptive baseline catches any deviation > 3σ from 70%.
        profile: { cpuMean: 70, cpuStd: 10, ramMean: 72, ramStd: 7,  tempMean: 65, tempStd: 5.5, trafficMean: 7,  trafficStd: 2.0 }
    },
    {
        name: "SYSTEM-HEALTH-MONITOR",
        type: "gateway",
        location: "Cloud Hub",
        profile: { cpuMean: 35, cpuStd: 7,  ramMean: 55, ramStd: 6,  tempMean: 45, tempStd: 4.0, trafficMean: 6,  trafficStd: 1.5 }
    },
    {
        name: "BACKUP-NODE",
        type: "gateway",
        location: "Basement",
        profile: { cpuMean: 30, cpuStd: 6,  ramMean: 52, ramStd: 6,  tempMean: 42, tempStd: 3.5, trafficMean: 4,  trafficStd: 1.0 }
    },
    {
        name: "DATA-AGGREGATOR",
        type: "gateway",
        location: "Main Office",
        profile: { cpuMean: 55, cpuStd: 9,  ramMean: 68, ramStd: 7,  tempMean: 52, tempStd: 5.0, trafficMean: 8,  trafficStd: 2.0 }
    },
    {
        name: "CENTRAL-CONTROL-NODE",
        type: "gateway",
        location: "Main Office",
        profile: { cpuMean: 60, cpuStd: 10, ramMean: 70, ramStd: 7,  tempMean: 58, tempStd: 5.5, trafficMean: 9,  trafficStd: 2.5 }
    }
];

// Maps to store credentials after registration
const deviceTokens = new Map();
const deviceIds    = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Logic
// ─────────────────────────────────────────────────────────────────────────────

async function registerDevice(config) {
    try {
        const payload = {
            name: config.name,
            type: config.type,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            location: config.location,
            baselineTraffic: Math.round(config.profile.trafficMean * 10)
        };

        const response = await axios.post(REGISTER_URL, payload);

        if (response.status === 201 || response.status === 200) {
            console.log(`✅ Registered/Logged in: ${config.name} | ID: ${response.data.deviceId}`);
            deviceTokens.set(config.name, response.data.token);
            deviceIds.set(config.name, response.data.deviceId);
            return response.data.token;
        }
        return null;
    } catch (error) {
        if (error.response && error.response.status === 409) {
            console.log(`❌ Device ${config.name} registration conflict (409).`);
            return null;
        }
        console.error(`❌ Registration failed for ${config.name}:`, error.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry Sending Logic
// ─────────────────────────────────────────────────────────────────────────────

async function sendPacket(deviceName, packetType = "heartbeat", options = {}) {
    const token = options.customToken || deviceTokens.get(deviceName);
    const id    = options.customId    || deviceIds.get(deviceName);

    if (!token && !options.customToken) {
        console.log(`⚠️  Skipping ${deviceName}: No token available.`);
        return;
    }

    // Find this device's profile for realistic telemetry generation
    const config  = deviceConfigs.find(d => d.name === deviceName);
    const profile = config ? config.profile : { cpuMean: 10, cpuStd: 3, ramMean: 35, ramStd: 5, tempMean: 25, tempStd: 2, trafficMean: 1, trafficStd: 0.3 };

    // Generate realistic values from the device's Gaussian profile
    // Override individual fields when simulating an attack
    const cpu     = options.cpuUsage         !== undefined ? options.cpuUsage
                  : clamp(Math.round(gaussianRandom(profile.cpuMean, profile.cpuStd)), 0, 100);

    const ram     = options.ramUsage         !== undefined ? options.ramUsage
                  : clamp(Math.round(gaussianRandom(profile.ramMean, profile.ramStd)), 0, 100);

    const traffic = options.packetFrequency  !== undefined ? options.packetFrequency
                  : clamp(parseFloat(gaussianRandom(profile.trafficMean, profile.trafficStd).toFixed(1)), 0, 1000);

    const temp    = options.sensorData?.temperature !== undefined ? options.sensorData.temperature
                  : parseFloat(gaussianRandom(profile.tempMean, profile.tempStd).toFixed(1));

    const payload = {
        deviceId:  id,
        timestamp: new Date().toISOString(),
        type:      packetType,
        data: {
            cpuUsage:        cpu,
            ramUsage:        ram,
            packetFrequency: traffic,
            loginStatus:     options.loginStatus || "SUCCESS",
            authHeader:      options.customHeader || `Bearer ${token}`,
            sensorData: {
                temperature: temp,
                humidity:    clamp(parseFloat(gaussianRandom(50, 5).toFixed(1)), 0, 100)
            }
        }
    };

    try {
        const response = await axios.post(TELEMETRY_URL, payload, {
            headers: { Authorization: options.customHeader || `Bearer ${token}` }
        });

        console.log(`📤 [${packetType.toUpperCase()}] ${deviceName} | CPU: ${cpu}% | RAM: ${ram}% | Traffic: ${traffic} pkt/s | Temp: ${temp}°C`);

        if (response.data.incidents && response.data.incidents.length > 0) {
            response.data.incidents.forEach(incident => {
                console.log(`   🚨 ALERT | Type: ${incident.threatType} | Severity: ${incident.severity}`);
                console.log(`      Details: ${incident.details}`);
            });
        }
    } catch (error) {
        const msg     = error.response?.data?.error   || error.message;
        const details = error.response?.data?.details ? ` → ${JSON.stringify(error.response.data.details)}` : '';
        console.error(`⚠️  Failed [${deviceName}]: ${msg}${details}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Attack Scenarios
// ─────────────────────────────────────────────────────────────────────────────

async function runBruteForce(deviceName) {
    console.log(`\n🔥 Brute Force Attack on ${deviceName}...`);
    for (let i = 0; i < 6; i++) {
        await sendPacket(deviceName, "login", { loginStatus: "FAIL" });
    }
}

async function runDDoS(deviceName) {
    console.log(`\n🌪️  DDoS Attack on ${deviceName}...`);
    const promises = [];
    for (let i = 0; i < 25; i++) {
        promises.push(sendPacket(deviceName, "traffic_spike", { packetFrequency: 50 }));
    }
    await Promise.all(promises);
}

async function runRogueDevice() {
    console.log(`\n🕵️  Rogue Device Simulation (Identity Spoofing)...`);
    const realDevice = deviceConfigs[0].name;
    await sendPacket(realDevice, "heartbeat", { customId: "ROGUE-DEVICE-999-EVIL" });
}

async function runSensorManipulation(deviceName) {
    console.log(`\n🌡️  Sensor Manipulation on ${deviceName}...`);

    console.log("  → Sending extreme temperature (500°C)...");
    await sendPacket(deviceName, "heartbeat", {
        sensorData: { temperature: 500 }
    });

    console.log("  → Sending rapid temperature jump (20°C → 60°C)...");
    await sendPacket(deviceName, "heartbeat", { sensorData: { temperature: 20 } });
    await new Promise(r => setTimeout(r, 500));
    await sendPacket(deviceName, "heartbeat", { sensorData: { temperature: 60 } });
}

async function runUnauthorizedAccess(deviceName) {
    console.log(`\n🚫 Unauthorized Access on ${deviceName}...`);
    await sendPacket(deviceName, "heartbeat", {
        customHeader: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.rogue_user_metadata.signature_here"
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Simulation Loop
// ─────────────────────────────────────────────────────────────────────────────

async function startSimulation() {
    console.log("🚀 Initializing IoT Simulator with per-device behavioral profiles...\n");
    console.log("📋 Device profiles loaded:");
    deviceConfigs.forEach(d => {
        const p = d.profile;
        console.log(`   ${d.name.padEnd(26)} CPU: ${p.cpuMean}±${p.cpuStd}%  RAM: ${p.ramMean}±${p.ramStd}%  Temp: ${p.tempMean}±${p.tempStd}°C  Traffic: ${p.trafficMean}±${p.trafficStd} pkt/s`);
    });

    console.log("\n📡 Registering all devices...\n");

    // 1. Register all devices
    for (const config of deviceConfigs) {
        await registerDevice(config);
    }

    console.log("\n✅ All devices registered. Starting calibration phase (normal traffic)...");
    console.log("   The adaptive baseline needs ~20 packets per device to learn their normal behavior.\n");

    // 2. Normal periodic traffic — adaptive baseline calibrates during this phase
    setInterval(async () => {
        const randomDevice = deviceConfigs[Math.floor(Math.random() * deviceConfigs.length)];
        await sendPacket(randomDevice.name);
    }, 2000);

    // 3. Trigger attack scenarios after baseline has calibrated (60s = ~30 packets per device)
    setTimeout(async () => {
        console.log("\n⚡ Calibration complete. Starting attack scenarios...\n");

        await runBruteForce("RFID-ACCESS-READER");
        await new Promise(r => setTimeout(r, 5000));

        await runDDoS("NETWORK-MONITOR");
        await new Promise(r => setTimeout(r, 5000));

        await runRogueDevice();
        await new Promise(r => setTimeout(r, 5000));

        await runSensorManipulation("TEMP-SENSOR-1");
        await new Promise(r => setTimeout(r, 5000));

        await runUnauthorizedAccess("SMART-DOOR-LOCK");

        console.log("\n✅ All attack scenarios complete. System continues normal monitoring.\n");
    }, 60000); // Wait 60s so adaptive baseline can calibrate
}

startSimulation();
