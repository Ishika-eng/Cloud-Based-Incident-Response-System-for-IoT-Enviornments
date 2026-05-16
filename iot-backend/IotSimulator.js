const axios = require('axios');

const API_URL = 'http://localhost:5001/api/simulate';

const THREATS = [
    { type: 'Port Scan Detected', severity: 'medium', deviceName: 'Entry Camera 01', deviceId: 'dev-003', pps: 800 },
    { type: 'Malware Signature Match', severity: 'high', deviceName: 'Cooling System Sensor', deviceId: 'dev-002', pps: 2000 },
    { type: 'Data Exfiltration', severity: 'critical', deviceName: 'Main SCADA Controller', deviceId: 'dev-001', pps: 6000 }
];

let packetsPerSecond = 500;

console.log('🤖 Starting IoT Simulator...');

// Simulate regular telemetry every 2 seconds
setInterval(async () => {
    try {
        packetsPerSecond = Math.max(100, packetsPerSecond + (Math.random() * 400 - 200));
        
        await axios.post(`${API_URL}/telemetry`, {
            timestamp: Date.now(),
            packets: Math.floor(packetsPerSecond),
            cpuUsage: 30 + Math.random() * 20,
            activeConnections: Math.floor(20 + Math.random() * 10)
        });
    } catch (e) {
        console.error('Failed to send telemetry:', e.message);
    }
}, 2000);

// Simulate a random threat every 20-40 seconds
const scheduleNextThreat = () => {
    const delay = 20000 + Math.random() * 20000;
    
    setTimeout(async () => {
        const threat = THREATS[Math.floor(Math.random() * THREATS.length)];
        packetsPerSecond = threat.pps; // Spike traffic
        
        console.log(`\n🚨 SIMULATING THREAT: ${threat.type} on ${threat.deviceName}`);
        
        try {
            await axios.post(`${API_URL}/threat`, {
                type: threat.type,
                severity: threat.severity,
                deviceId: threat.deviceId,
                deviceName: threat.deviceName,
                packetsPerSecond: threat.pps
            });
            console.log('✅ Threat successfully injected to backend.');
        } catch (e) {
            console.error('❌ Failed to inject threat:', e.message);
        }
        
        scheduleNextThreat();
    }, delay);
};

scheduleNextThreat();
