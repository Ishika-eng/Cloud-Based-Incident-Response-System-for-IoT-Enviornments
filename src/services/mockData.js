import { DEVICE_TYPES, DEVICE_STATUS } from '../constants/deviceTypes.js';
import { SEVERITY } from '../constants/severity.js';

export const mockDevices = [
    { id: 'd-01', name: 'EDGE-GW-001', type: DEVICE_TYPES.NETWORK_GATEWAY, status: DEVICE_STATUS.ACTIVE, ip: '192.168.1.1', location: 'Server Room A', lastSeen: new Date(Date.now() - 1000 * 60 * 2).toISOString(), firmwareVersion: 'v2.4.1', uptimeDays: 45, totalIncidents: 12 },
    { id: 'd-02', name: 'CAM-LOBBY-E1', type: DEVICE_TYPES.ESP32_CAM, status: DEVICE_STATUS.ACTIVE, ip: '10.0.1.45', location: 'East Lobby', lastSeen: new Date(Date.now() - 1000 * 60 * 1).toISOString(), firmwareVersion: 'v1.0.5', uptimeDays: 120, totalIncidents: 3 },
    { id: 'd-03', name: 'HVAC-CTRL-B2', type: DEVICE_TYPES.INDUSTRIAL_CONTROLLER, status: DEVICE_STATUS.ACTIVE, ip: '10.0.5.12', location: 'Basement 2', lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(), firmwareVersion: 'v3.1.0', uptimeDays: 300, totalIncidents: 0 },
    { id: 'd-04', name: 'SENSOR-DOCK-04', type: DEVICE_TYPES.ARM_CORTEX_M4, status: DEVICE_STATUS.OFFLINE, ip: '10.0.2.88', location: 'Loading Dock', lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), firmwareVersion: 'v1.2.2', uptimeDays: 0, totalIncidents: 1 },
    { id: 'd-05', name: 'ARM-NODE-07', type: DEVICE_TYPES.ARM_CORTEX_M4, status: DEVICE_STATUS.ACTIVE, ip: '10.0.2.23', location: 'Warehouse Sec-3', lastSeen: new Date(Date.now() - 1000 * 60 * 3).toISOString(), firmwareVersion: 'v1.2.4', uptimeDays: 56, totalIncidents: 5 },
    { id: 'd-06', name: 'JETSON-CAM-02', type: DEVICE_TYPES.JETSON_NANO, status: DEVICE_STATUS.COMPROMISED, ip: '10.0.3.14', location: 'Perimeter North', lastSeen: new Date(Date.now() - 1000 * 60 * 1).toISOString(), firmwareVersion: 'v4.0.0', uptimeDays: 12, totalIncidents: 45 },
    { id: 'd-07', name: 'PI-MONITOR-11', type: DEVICE_TYPES.RASPBERRY_PI_4, status: DEVICE_STATUS.ACTIVE, ip: '10.0.4.55', location: 'IT Dept', lastSeen: new Date(Date.now() - 1000 * 60 * 1).toISOString(), firmwareVersion: 'v2.1.1', uptimeDays: 89, totalIncidents: 2 },
    { id: 'd-08', name: 'ESP-TEMP-19', type: DEVICE_TYPES.ESP32_CAM, status: DEVICE_STATUS.ACTIVE, ip: '10.0.1.99', location: 'Server Room B', lastSeen: new Date(Date.now() - 1000 * 60 * 2).toISOString(), firmwareVersion: 'v1.0.5', uptimeDays: 210, totalIncidents: 0 },
    { id: 'd-09', name: 'CTRL-UNIT-03', type: DEVICE_TYPES.INDUSTRIAL_CONTROLLER, status: DEVICE_STATUS.ACTIVE, ip: '10.0.5.15', location: 'Assembly Line 1', lastSeen: new Date(Date.now() - 1000 * 60 * 4).toISOString(), firmwareVersion: 'v3.1.0', uptimeDays: 154, totalIncidents: 1 },
    { id: 'd-10', name: 'CAM-PARK-W3', type: DEVICE_TYPES.ESP32_CAM, status: DEVICE_STATUS.BLOCKED, ip: '10.0.1.33', location: 'West Parking', lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(), firmwareVersion: 'v1.0.4', uptimeDays: 3, totalIncidents: 12 },
    { id: 'd-11', name: 'GATEWAY-CORE-01', type: DEVICE_TYPES.NETWORK_GATEWAY, status: DEVICE_STATUS.ACTIVE, ip: '192.168.1.2', location: 'Main Entrance', lastSeen: new Date(Date.now() - 1000 * 30).toISOString(), firmwareVersion: 'v2.4.2', uptimeDays: 450, totalIncidents: 8 },
    { id: 'd-12', name: 'FIREWALL-DMZ-1', type: DEVICE_TYPES.JETSON_NANO, status: DEVICE_STATUS.ACTIVE, ip: '172.16.0.1', location: 'DMZ Rack 1', lastSeen: new Date(Date.now() - 1000 * 15).toISOString(), firmwareVersion: 'v4.1.0', uptimeDays: 60, totalIncidents: 110 },
    { id: 'd-13', name: 'SWITCH-FLOOR2', type: DEVICE_TYPES.ARM_CORTEX_M4, status: DEVICE_STATUS.ACTIVE, ip: '10.0.2.1', location: 'Floor 2 Comm', lastSeen: new Date(Date.now() - 1000 * 60 * 1).toISOString(), firmwareVersion: 'v1.2.4', uptimeDays: 34, totalIncidents: 0 },
    { id: 'd-14', name: 'SENSOR-RACK-08', type: DEVICE_TYPES.RASPBERRY_PI_4, status: DEVICE_STATUS.ACTIVE, ip: '10.0.4.22', location: 'Server Room A', lastSeen: new Date(Date.now() - 1000 * 60 * 2).toISOString(), firmwareVersion: 'v2.1.0', uptimeDays: 14, totalIncidents: 1 },
    { id: 'd-15', name: 'CAM-SERVER-01', type: DEVICE_TYPES.ESP32_CAM, status: DEVICE_STATUS.ACTIVE, ip: '10.0.1.101', location: 'Server Room A', lastSeen: new Date(Date.now() - 1000 * 60 * 1).toISOString(), firmwareVersion: 'v1.0.6', uptimeDays: 200, totalIncidents: 0 },
    { id: 'd-16', name: 'NODE-EDGE-14', type: DEVICE_TYPES.RASPBERRY_PI_4, status: DEVICE_STATUS.COMPROMISED, ip: '10.0.4.77', location: 'Public Kiosk 1', lastSeen: new Date(Date.now() - 1000 * 60 * 10).toISOString(), firmwareVersion: 'v2.0.1', uptimeDays: 4, totalIncidents: 38 },
    { id: 'd-17', name: 'ESP-HUMID-06', type: DEVICE_TYPES.ESP32_CAM, status: DEVICE_STATUS.ACTIVE, ip: '10.0.1.56', location: 'Greenhouse', lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(), firmwareVersion: 'v1.0.5', uptimeDays: 80, totalIncidents: 0 },
    { id: 'd-18', name: 'PI-LOGGER-09', type: DEVICE_TYPES.RASPBERRY_PI_4, status: DEVICE_STATUS.BLOCKED, ip: '10.0.4.15', location: 'Temp Storage', lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), firmwareVersion: 'v2.1.1', uptimeDays: 2, totalIncidents: 14 },
    { id: 'd-19', name: 'ARM-CTRL-05', type: DEVICE_TYPES.ARM_CORTEX_M4, status: DEVICE_STATUS.OFFLINE, ip: '10.0.2.44', location: 'Boiler Room', lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), firmwareVersion: 'v1.2.0', uptimeDays: 0, totalIncidents: 2 },
    { id: 'd-20', name: 'CAM-EXIT-S2', type: DEVICE_TYPES.JETSON_NANO, status: DEVICE_STATUS.BLOCKED, ip: '10.0.3.18', location: 'South Exit 2', lastSeen: new Date(Date.now() - 1000 * 60 * 45).toISOString(), firmwareVersion: 'v4.0.0', uptimeDays: 1, totalIncidents: 22 }
];

export const mockIncidents = [
    // Brute Force (35% -> 18 incidents)
    ...Array.from({ length: 18 }).map((_, i) => ({
        id: `inc-${100 + i}`,
        deviceId: mockDevices[i % 20].id,
        deviceName: mockDevices[i % 20].name,
        type: 'Brute Force',
        severity: i % 4 === 0 ? SEVERITY.CRITICAL : i % 2 === 0 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: i < 5 ? 'open' : i < 10 ? 'acknowledged' : 'resolved',
        sourceIP: `185.15${i}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        description: `Detected ${Math.floor(Math.random() * 500) + 100} failed login attempts in 5 minutes via SSH.`,
        affectedPort: 22
    })),
    // DDoS (30% -> 15 incidents)
    ...Array.from({ length: 15 }).map((_, i) => ({
        id: `inc-${200 + i}`,
        deviceId: mockDevices[(i * 3) % 20].id,
        deviceName: mockDevices[(i * 3) % 20].name,
        type: 'DDoS',
        severity: i % 3 === 0 ? SEVERITY.CRITICAL : SEVERITY.HIGH,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: i < 3 ? 'open' : i < 8 ? 'acknowledged' : 'resolved',
        sourceIP: 'Multiple IPs',
        description: `Volumetric attack detected exceeding ${Math.floor(Math.random() * 50) + 10} Gbps towards gateway interfaces.`,
        affectedPort: 443
    })),
    // Unauthorized Access (20% -> 10 incidents)
    ...Array.from({ length: 10 }).map((_, i) => ({
        id: `inc-${300 + i}`,
        deviceId: mockDevices[(i * 5) % 20].id,
        deviceName: mockDevices[(i * 5) % 20].name,
        type: 'Unauthorized Access',
        severity: i % 2 === 0 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: i < 2 ? 'open' : i < 5 ? 'acknowledged' : 'resolved',
        sourceIP: `10.0.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 255)}`,
        description: 'Successful login detected from an unrecognized internal IP subnet.',
        affectedPort: 80
    })),
    // Port Scan (15% -> 7 incidents)
    ...Array.from({ length: 7 }).map((_, i) => ({
        id: `inc-${400 + i}`,
        deviceId: mockDevices[(i * 7) % 20].id,
        deviceName: mockDevices[(i * 7) % 20].name,
        type: 'Port Scan',
        severity: SEVERITY.LOW,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: i < 4 ? 'open' : 'resolved',
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        description: 'Sequential port scan detected across the standard service port range.',
        affectedPort: 'All'
    }))
].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const mockUsers = [
    { id: 'u1', email: 'admin@gmail.com', name: 'Admin', role: 'admin' },
];

export const mockSettings = {
    notifications: {
        critical: true,
        high: true,
        medium: false
    },
    thresholds: {
        bruteForce: 5,
        ddosMultiplier: 10
    },
    apiKey: 'sk-iot-8f83he2d94mcn39dk44'
};
