const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT']
    }
});

// --- In-Memory Database ---
let devices = [
    { id: 'dev-001', name: 'Main SCADA Controller', type: 'PLC', ip: '192.168.1.10', status: 'active', location: 'Zone A', firmwareVersion: 'v2.1.4', uptimeDays: 45, lastSeen: Date.now() },
    { id: 'dev-002', name: 'Cooling System Sensor', type: 'Sensor', ip: '192.168.1.15', status: 'active', location: 'Zone B', firmwareVersion: 'v1.0.2', uptimeDays: 120, lastSeen: Date.now() },
    { id: 'dev-003', name: 'Entry Camera 01', type: 'Camera', ip: '192.168.1.20', status: 'active', location: 'Gate 1', firmwareVersion: 'v3.0.0', uptimeDays: 12, lastSeen: Date.now() },
    { id: 'dev-004', name: 'Pressure Valve Monitor', type: 'Controller', ip: '192.168.1.30', status: 'warning', location: 'Zone A', firmwareVersion: 'v2.1.0', uptimeDays: 5, lastSeen: Date.now() },
    { id: 'dev-005', name: 'Backup Generator', type: 'Generator', ip: '192.168.1.50', status: 'active', location: 'Zone C', firmwareVersion: 'v4.1.1', uptimeDays: 300, lastSeen: Date.now() },
    { id: 'dev-006', name: 'HVAC Control Unit', type: 'PLC', ip: '192.168.1.60', status: 'active', location: 'Zone B', firmwareVersion: 'v2.1.4', uptimeDays: 45, lastSeen: Date.now() },
];

let incidents = [
    { id: 'inc-1001', type: 'Unauthorized Access', severity: 'high', deviceId: 'dev-003', deviceName: 'Entry Camera 01', timestamp: Date.now() - 3600000, status: 'open', sourceIP: '203.0.113.42', affectedPort: 80, description: 'Multiple failed login attempts followed by anomalous traffic.' },
    { id: 'inc-1002', type: 'Firmware Tampering', severity: 'critical', deviceId: 'dev-004', deviceName: 'Pressure Valve Monitor', timestamp: Date.now() - 7200000, status: 'resolved', sourceIP: '198.51.100.12', affectedPort: 22, description: 'Unauthorized modification to firmware hash detected.' },
    { id: 'inc-1003', type: 'DDoS Attempt', severity: 'medium', deviceId: 'dev-001', deviceName: 'Main SCADA Controller', timestamp: Date.now() - 86400000, status: 'open', sourceIP: '192.0.2.1', affectedPort: 443, description: 'Volumetric traffic flood originating from multiple IPs.' },
];

// --- REST API ENDPOINTS ---

// Auth
app.post('/api/auth/login', (req, res) => {
    res.json({ user: { id: 1, name: 'Admin', role: 'Security Analyst' }, token: 'mock-jwt-token-123' });
});

app.post('/api/auth/dashboard', (req, res) => {
    res.json({ token: 'dashboard-socket-token-456' });
});

// Devices
app.get('/api/devices', (req, res) => {
    res.json(devices);
});

app.put('/api/devices/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const device = devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    
    device.status = status;
    
    // Broadcast status change
    const eventName = status === 'blocked' ? 'device-blocked' : 'device-unblocked';
    io.emit(eventName, { deviceId: id, device });
    
    res.json(device);
});

// Incidents
app.get('/api/incidents', (req, res) => {
    res.json(incidents);
});

app.post('/api/incidents/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { resolution } = req.body;
    
    const incident = incidents.find(i => i.id === id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    
    incident.status = 'resolved';
    incident.resolution = resolution || 'Resolved by admin';
    
    io.emit('incident-resolved', { incidentId: id });
    res.json(incident);
});

// Health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        components: { database: 'up', activeDevices: devices.filter(d => d.status === 'active').length }
    });
});

// Telemetry Mock (for DeviceDrawer)
app.get('/api/telemetry/device/:id', (req, res) => {
    const data = Array.from({ length: 20 }).map((_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        cpu: 20 + Math.random() * 30,
        network: 10 + Math.random() * 40
    }));
    res.json(data);
});

// --- Internal API for Simulator ---
app.post('/api/simulate/threat', (req, res) => {
    const newIncident = {
        id: `inc-${Math.floor(Math.random() * 9000) + 1000}`,
        type: req.body.type || 'Anomalous Activity',
        severity: req.body.severity || 'high',
        deviceId: req.body.deviceId || 'dev-001',
        deviceName: req.body.deviceName || 'Main SCADA Controller',
        timestamp: Date.now(),
        status: 'open',
        sourceIP: 'Unknown',
        affectedPort: Math.floor(Math.random() * 65000),
        description: 'Simulated threat detected by external simulator.'
    };
    
    incidents.unshift(newIncident);
    
    // Convert to socket format expected by frontend
    const socketPayload = {
        alertId: newIncident.id,
        eventType: newIncident.type,
        severity: newIncident.severity,
        deviceId: newIncident.deviceId,
        deviceName: newIncident.deviceName,
        timestamp: newIncident.timestamp,
        packetsPerSecond: req.body.packetsPerSecond || 5000
    };
    
    io.emit('threat-detected', socketPayload);
    
    if (newIncident.severity === 'critical') {
        io.emit('device-compromised', { 
            deviceId: newIncident.deviceId, 
            deviceName: newIncident.deviceName, 
            threatType: newIncident.type 
        });
        
        // Update device status internally
        const dev = devices.find(d => d.id === newIncident.deviceId);
        if (dev) {
            dev.status = 'critical';
            io.emit('device-status-change', { deviceId: dev.id, device: dev });
        }
    }
    
    res.json(newIncident);
});

app.post('/api/simulate/telemetry', (req, res) => {
    io.emit('live-telemetry', req.body);
    res.json({ success: true });
});


// --- Websocket Connection ---
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🚀 ThreatNest Backend Server running on http://localhost:${PORT}`);
});
