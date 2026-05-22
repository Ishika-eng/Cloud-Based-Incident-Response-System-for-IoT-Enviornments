import axios from 'axios';
import { mockDevices, mockIncidents, mockUsers, mockSettings } from './mockData.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const USE_REAL_API = true; // Always use real backend; falls back to mock on network errors

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

let _getToken = () => null;
let _logout = () => { };

export const setApiAuthHooks = (getToken, logout) => {
    _getToken = getToken;
    _logout = logout;
};

api.interceptors.request.use((config) => {
    // Use backend device token for API calls
    const backendToken = localStorage.getItem('dashboard_token');
    const userToken = _getToken();
    const token = backendToken || userToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only logout user session for 401s that aren't the register endpoint
            if (!error.config?.url?.includes('/auth/register')) {
                _logout();
            }
        }
        return Promise.reject(error);
    }
);

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Normalize backend device to frontend shape ───────────────────────────────
const normalizeDevice = (d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    status: d.status,
    ip: d.ipAddress || d.ip || 'N/A',
    location: d.location || 'Unknown',
    lastSeen: d.lastSeen || new Date().toISOString(),
    baselineTraffic: d.baselineTraffic || 0,
    unresolvedIncidents: d.unresolvedIncidents || 0,
    firmwareVersion: d.firmwareVersion || 'v1.0.0',
    uptimeDays: d.uptimeDays || 0,
    totalIncidents: d.unresolvedIncidents || d.totalIncidents || 0,
    latestSensorData: d.latestSensorData || null,
    latestSensorTimestamp: d.latestSensorTimestamp || null,
});

// ─── Normalize backend incident to frontend shape ──────────────────────────────
const normalizeIncident = (i) => ({
    id: i.incidentId || i.id,
    incidentId: i.incidentId || i.id,
    deviceId: i.deviceId,
    deviceName: i.deviceName || i.deviceId,
    type: i.type,
    severity: (i.severity || '').toLowerCase(),
    timestamp: i.timestamp || new Date().toISOString(),
    status: i.status || 'open',
    description: i.details || i.description || i.type,
});

// ─── Dashboard Device Registration (backend auth) ─────────────────────────────
export const initDashboard = async () => {
    const stored = localStorage.getItem('dashboard_token');
    if (stored) {
        api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
        return stored;
    }
    try {
        const res = await api.post('/api/auth/register', {
            name: 'DASHBOARD-ADMIN',
            type: 'gateway',
            ipAddress: '192.168.1.200',
            location: 'Admin Panel',
        });
        const token = res.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('dashboard_token', token);
        return token;
    } catch (err) {
        console.warn('[ThreatNest] Backend not reachable — running in mock mode');
        return null;
    }
};

// ─── Health Check ─────────────────────────────────────────────────────────────
export const getHealth = async () => {
    try {
        const res = await api.get('/health');
        return res;
    } catch {
        return { data: { status: 'offline', database: 'disconnected', uptime: 0 } };
    }
};

// ─── Authentication (user login) ─────────────────────────────────────────────
const VALID_CREDENTIALS = [
    { email: 'admin@gmail.com', password: 'admin123', name: 'Admin', role: 'admin' },
];

export const login = async (email, password) => {
    // Always validate credentials first, regardless of API mode
    const match = VALID_CREDENTIALS.find(
        (c) => c.email === email && c.password === password
    );
    if (!match) {
        await delay(400); // small delay to prevent brute-force timing
        throw new Error('Invalid email or password');
    }

    if (USE_REAL_API) {
        // Credentials valid — now get a backend device token for API calls
        const token = await initDashboard();
        if (token) {
            return { data: { user: { name: match.name, email: match.email, role: match.role }, token } };
        }
        throw new Error('Backend connection failed.');
    }
    await delay(800);
    return { data: { user: { name: match.name, email: match.email, role: match.role }, token: 'mock-jwt-token-xyz-123' } };
    throw new Error('Invalid credentials');
};

export const logout = async () => {
    await delay(200);
    localStorage.removeItem('dashboard_token');
    return { data: { success: true } };
};

export const refreshToken = async () => {
    await delay(300);
    return { data: { token: 'mock-jwt-token-new-456' } };
};

// ─── Devices ──────────────────────────────────────────────────────────────────
export const addDevice = async (device) => {
    await delay(600);
    const newDevice = {
        id: `d-${mockDevices.length + 100}`,
        ...device,
        status: 'Active',
        lastSeen: new Date().toISOString(),
        firmwareVersion: 'v1.0.0',
        uptimeDays: 0,
        totalIncidents: 0,
    };
    mockDevices.unshift(newDevice);
    return { data: newDevice };
};

export const getDevices = async (params) => {
    try {
        const res = await api.get('/api/devices', { params });
        const devices = (res.data.devices || res.data || []).map(normalizeDevice);
        return { data: devices };
    } catch {
        await delay();
        return { data: mockDevices };
    }
};

export const getDevice = async (id) => {
    try {
        const res = await api.get(`/api/devices/${id}`);
        return { data: normalizeDevice(res.data.device || res.data) };
    } catch {
        await delay();
        const device = mockDevices.find((d) => d.id === id);
        if (!device) throw new Error('Device not found');
        return { data: device };
    }
};

export const blockDevice = async (id) => {
    try {
        const res = await api.patch(`/api/devices/${id}/block`);
        return { data: normalizeDevice(res.data.device || res.data) };
    } catch {
        await delay(600);
        const device = mockDevices.find((d) => d.id === id);
        if (device) device.status = 'Blocked';
        return { data: device };
    }
};

export const unblockDevice = async (id) => {
    try {
        const res = await api.patch(`/api/devices/${id}/unblock`);
        return { data: normalizeDevice(res.data.device || res.data) };
    } catch {
        await delay(600);
        const device = mockDevices.find((d) => d.id === id);
        if (device) device.status = 'Active';
        return { data: device };
    }
};

export const updateDeviceStatus = async (id, status) => {
    if (status === 'Blocked' || status === 'blocked') return blockDevice(id);
    if (status === 'Active' || status === 'active') return unblockDevice(id);
    await delay(600);
    const device = mockDevices.find((d) => d.id === id);
    if (device) device.status = status;
    return { data: device };
};

export const getDeviceTelemetry = async (id, range = '7d') => {
    await delay();
    const points = 24;
    const now = Date.now();
    const device = mockDevices.find((d) => d.id === id);
    const baseLoad = device?.status === 'Compromised' ? 70 : device?.status === 'Blocked' ? 0 : 30;
    return {
        data: Array.from({ length: points }, (_, i) => ({
            time: new Date(now - (points - i) * 60 * 60 * 1000).toISOString(),
            cpu: Math.max(0, Math.min(100, baseLoad + Math.sin(i * 0.5) * 20 + (Math.random() - 0.5) * 15)),
            network: Math.max(0, Math.min(100, baseLoad * 0.8 + Math.cos(i * 0.4) * 15 + (Math.random() - 0.5) * 10)),
        })),
    };
};

// ─── Incidents ────────────────────────────────────────────────────────────────
export const getIncidents = async (filters = {}) => {
    try {
        const params = {};
        if (filters.severity?.length === 1) params.severity = filters.severity[0];
        if (filters.deviceId) params.deviceId = filters.deviceId;
        const res = await api.get('/api/incidents', { params });
        const incidents = (res.data.incidents || res.data || []).map(normalizeIncident);
        // Apply client-side multi-value filters
        let result = incidents;
        if (filters.severity?.length > 1) result = result.filter((i) => filters.severity.map((s) => s.toLowerCase()).includes(i.severity));
        if (filters.type?.length > 0) result = result.filter((i) => filters.type.includes(i.type));
        if (filters.status?.length > 0) result = result.filter((i) => filters.status.includes(i.status));
        return { data: result };
    } catch {
        await delay();
        let results = [...mockIncidents];
        if (filters.status?.length > 0) results = results.filter((inc) => filters.status.includes(inc.status));
        if (filters.severity?.length > 0) results = results.filter((inc) => filters.severity.map((s) => s.toLowerCase()).includes(inc.severity));
        return { data: results };
    }
};

export const getIncident = async (id) => {
    await delay();
    const incident = mockIncidents.find((i) => i.id === id);
    if (!incident) throw new Error('Incident not found');
    return { data: incident };
};

export const resolveIncident = async (id, resolution = 'Resolved by admin') => {
    try {
        const res = await api.patch(`/api/incidents/${id}/resolve`, { resolution });
        return { data: normalizeIncident(res.data.incident || res.data) };
    } catch {
        await delay(600);
        const incident = mockIncidents.find((i) => i.id === id || i.incidentId === id);
        if (incident) incident.status = 'resolved';
        return { data: incident };
    }
};

export const acknowledgeIncident = async (id) => {
    await delay(600);
    const incident = mockIncidents.find((i) => i.id === id);
    if (incident && incident.status === 'open') incident.status = 'acknowledged';
    return { data: incident };
};

// ─── Analytics ────────────────────────────────────────────────────────────────

// Helper: fetch up to 500 incidents for client-side analytics aggregation
const fetchAllIncidents = async () => {
    try {
        const res = await api.get('/api/incidents', { params: { limit: 500 } });
        const incidents = (res.data.incidents || res.data || []).map(normalizeIncident);
        return { data: incidents };
    } catch {
        return { data: mockIncidents };
    }
};

// Helper: JS getDay() → 0=Sun … 6=Sat; convert to Mon-based index (0=Mon … 6=Sun)
const toMondayIndex = (date) => (date.getDay() + 6) % 7;

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatHour = (h) => {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:00 ${suffix}`;
};

export const getAnalytics = async (range = '7d') => {
    try {
        const [incRes, devRes] = await Promise.all([fetchAllIncidents(), getDevices()]);
        const incidents = incRes.data;
        const devices = devRes.data;

        if (!incidents.length) throw new Error('no data');

        // Build deviceId → name map
        const deviceMap = {};
        devices.forEach((d) => { deviceMap[d.id] = d.name; });

        const hourCounts = Array(24).fill(0);
        const dayCounts = Array(7).fill(0);
        const deviceCounts = {};

        incidents.forEach((inc) => {
            const d = new Date(inc.timestamp);
            hourCounts[d.getHours()]++;
            dayCounts[toMondayIndex(d)]++;
            const name = deviceMap[inc.deviceId] || inc.deviceId;
            deviceCounts[name] = (deviceCounts[name] || 0) + 1;
        });

        const mostActiveHour = formatHour(hourCounts.indexOf(Math.max(...hourCounts)));
        const peakAttackDay = DAY_NAMES[dayCounts.indexOf(Math.max(...dayCounts))];
        const mostTargetedDevice = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        return {
            data: {
                mostActiveHour,
                mostTargetedDevice,
                peakAttackDay,
                totalAttacks: incidents.length,
            },
        };
    } catch {
        return {
            data: {
                mostActiveHour: '03:00 AM',
                mostTargetedDevice: 'NODE-EDGE-14',
                peakAttackDay: 'Tuesday',
                totalAttacks: mockIncidents.length,
            },
        };
    }
};

export const getAttackHeatmap = async (range = '7d') => {
    try {
        const incRes = await fetchAllIncidents();
        const incidents = incRes.data;

        if (!incidents.length) throw new Error('no data');

        // Build a flat list of { day, hour, count } entries
        const grid = {};
        incidents.forEach((inc) => {
            const d = new Date(inc.timestamp);
            const day = toMondayIndex(d);
            const hour = d.getHours();
            const key = `${day}-${hour}`;
            grid[key] = (grid[key] || 0) + 1;
        });

        const heatmap = [];
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                heatmap.push({ day, hour, count: grid[`${day}-${hour}`] || 0 });
            }
        }
        return { data: heatmap };
    } catch {
        // Fallback: deterministic-looking zeros (no random flicker on reload)
        const heatmap = [];
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                heatmap.push({ day, hour, count: 0 });
            }
        }
        return { data: heatmap };
    }
};

export const getTopTargets = async (range = '7d') => {
    try {
        const [incRes, devRes] = await Promise.all([fetchAllIncidents(), getDevices()]);
        const incidents = incRes.data;
        const devices = devRes.data;

        if (!incidents.length) throw new Error('no data');

        const deviceMap = {};
        devices.forEach((d) => { deviceMap[d.id] = d.name; });

        const counts = {};
        incidents.forEach((inc) => {
            const name = deviceMap[inc.deviceId] || inc.deviceId;
            counts[name] = (counts[name] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return { data: sorted };
    } catch {
        return {
            data: [
                { name: 'FIREWALL-DMZ-1', count: 110 },
                { name: 'JETSON-CAM-02', count: 45 },
                { name: 'NODE-EDGE-14', count: 38 },
                { name: 'CAM-EXIT-S2', count: 22 },
                { name: 'PI-LOGGER-09', count: 14 },
            ],
        };
    }
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = async () => {
    await delay();
    return { data: mockSettings };
};

export const updateSettings = async (payload) => {
    await delay(800);
    Object.assign(mockSettings, payload);
    return { data: mockSettings };
};

export default api;
