import { useState, useEffect, useContext, useRef, createContext } from 'react';
import { io } from 'socket.io-client';
import { mockDevices } from '../services/mockData';
import { SEVERITY } from '../constants/severity';
import { AlertContext } from '../context/AlertContext';

const SOCKET_EVENTS = {
    THREAT_DETECTED: 'threat-detected',
    DEVICE_COMPROMISED: 'device-compromised',
    LIVE_TELEMETRY: 'live-telemetry',
    DEVICE_BLOCKED: 'device-blocked',
    DEVICE_UNBLOCKED: 'device-unblocked',
    INCIDENT_RESOLVED: 'incident-resolved',
};

export { SOCKET_EVENTS };

// ── Singleton WebSocket context ───────────────────────────────────────────────
// All dashboard components share ONE socket connection instead of each creating
// their own. Prevents the 5-socket explosion and the [alertContext] re-render loop.
export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastThreat, setLastThreat] = useState(null);
    const [liveFeedEntries, setLiveFeedEntries] = useState([]);
    const [deviceStatusUpdates, setDeviceStatusUpdates] = useState(null);
    const [compromisedDevice, setCompromisedDevice] = useState(null);
    const [resolvedIncident, setResolvedIncident] = useState(null);
    const [liveMetrics, setLiveMetrics] = useState({ cpu: 0, ram: 0, packets: 0 });
    const [sensorReadings, setSensorReadings] = useState({});

    // Use a ref for alertContext so we never put it in the effect dep array.
    // The ref always points to the latest context value without triggering reconnects.
    const alertContext = useContext(AlertContext);
    const alertContextRef = useRef(alertContext);
    useEffect(() => {
        alertContextRef.current = alertContext;
    }, [alertContext]);

    const socketRef = useRef(null);

    useEffect(() => {
        const wsUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL;

        if (wsUrl) {
            // ── Real Socket.IO connection ──────────────────────────────────────
            const socket = io(wsUrl, {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('[ThreatNest] Socket connected:', socket.id);
                setIsConnected(true);
            });

            socket.on('disconnect', () => {
                console.log('[ThreatNest] Socket disconnected');
                setIsConnected(false);
            });

            socket.on(SOCKET_EVENTS.THREAT_DETECTED, (data) => {
                const entry = {
                    id: `threat-${Date.now()}-${Math.random()}`,
                    deviceId: data.deviceId,
                    deviceName: data.deviceId,
                    eventType: data.threatType,
                    severity: (data.severity || 'high').toLowerCase(),
                    timestamp: data.timestamp || new Date().toISOString(),
                    packetsPerSecond: Math.floor(Math.random() * 3000) + 500,
                    details: data.details,
                    alertId: data.alertId,
                };

                setLiveFeedEntries((prev) => [entry, ...prev].slice(0, 150));
                setLastThreat({ ...data, type: data.threatType });

                // Use ref — never re-creates the socket when notifications change
                if (alertContextRef.current) {
                    alertContextRef.current.addNotification({
                        ...entry,
                        message: `Threat detected on ${entry.deviceName}: ${entry.eventType}`,
                    });
                }
            });

            socket.on(SOCKET_EVENTS.DEVICE_COMPROMISED, (data) => {
                console.warn('[ThreatNest] DEVICE COMPROMISED:', data);
                setCompromisedDevice(data);

                if (alertContextRef.current) {
                    alertContextRef.current.addCriticalAlert({
                        id: data.alertId,
                        deviceName: data.device?.name || data.deviceId,
                        type: data.threatType || 'System Compromised',
                        severity: 'critical',
                        timestamp: data.timestamp,
                        message: 'CRITICAL THREAT DETECTED',
                    });
                }

                const entry = {
                    id: `compromised-${Date.now()}`,
                    deviceId: data.deviceId,
                    deviceName: data.device?.name || data.deviceId,
                    eventType: '🔴 DEVICE COMPROMISED',
                    severity: 'critical',
                    timestamp: data.timestamp || new Date().toISOString(),
                    packetsPerSecond: 9999,
                };
                setLiveFeedEntries((prev) => [entry, ...prev].slice(0, 150));
                setDeviceStatusUpdates({ type: 'compromised', device: { ...data.device, status: 'Blocked' } });
            });

            socket.on(SOCKET_EVENTS.LIVE_TELEMETRY, (data) => {
                const ts = data.timestamp
                    ? (typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp).toISOString())
                    : new Date().toISOString();

                const entry = {
                    id: `tel-${Date.now()}-${Math.random()}`,
                    deviceId: data.deviceId,
                    deviceName: data.device?.name || data.deviceId,
                    eventType: data.type || 'heartbeat',
                    severity: data.incidents?.length > 0 ? 'high' : 'low',
                    timestamp: ts,
                    packetsPerSecond: data.data?.packetFrequency ?? Math.floor(Math.random() * 1000),
                    cpuLoad: data.data?.cpuUsage ?? 0,
                    memoryUsage: data.data?.ramUsage ?? 0,
                };

                setLiveFeedEntries((prev) => [entry, ...prev].slice(0, 150));
                setLiveMetrics({
                    cpu: data.data?.cpuUsage ?? 0,
                    ram: data.data?.ramUsage ?? 0,
                    packets: data.data?.packetFrequency ?? 0,
                });

                const sensor = data.data?.sensorData;
                if (sensor && Object.keys(sensor).length > 0) {
                    setSensorReadings((prev) => ({
                        ...prev,
                        [data.deviceId]: {
                            deviceName: data.device?.name || data.deviceId,
                            location:   data.device?.location || '',
                            ...sensor,
                            lastUpdated: new Date().toISOString(),
                        },
                    }));
                }
            });

            socket.on(SOCKET_EVENTS.DEVICE_BLOCKED, (data) => {
                setDeviceStatusUpdates({ type: 'blocked', device: data.device });
            });

            socket.on(SOCKET_EVENTS.DEVICE_UNBLOCKED, (data) => {
                setDeviceStatusUpdates({ type: 'unblocked', device: data.device });
            });

            socket.on(SOCKET_EVENTS.INCIDENT_RESOLVED, (data) => {
                setResolvedIncident(data);
            });

            return () => {
                socket.disconnect();
                socketRef.current = null;
            };
        } else {
            // ── Mock mode ──────────────────────────────────────────────────────
            setIsConnected(true);

            const eventTypes = ['Port Scan', 'Traffic Spike', 'Login Failed', 'Ping Sweep', 'Firmware Update'];

            const telemetryInterval = setInterval(() => {
                const randomDevice = mockDevices[Math.floor(Math.random() * mockDevices.length)];
                const cpu = Math.floor(Math.random() * 80) + 5;
                const ram = Math.floor(Math.random() * 75) + 10;
                const packets = Math.floor(Math.random() * 5000);

                const entry = {
                    id: `tel-${Date.now()}`,
                    deviceId: randomDevice.id,
                    deviceName: randomDevice.name,
                    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                    severity: Math.random() > 0.9 ? SEVERITY.HIGH : SEVERITY.LOW,
                    timestamp: new Date().toISOString(),
                    packetsPerSecond: packets,
                    cpuLoad: cpu,
                    memoryUsage: ram,
                    loginAttempts: Math.floor(Math.random() * 5),
                };

                setLiveFeedEntries((prev) => [entry, ...prev].slice(0, 150));
                setLiveMetrics({ cpu, ram, packets });
            }, 2000);

            const threatInterval = setInterval(() => {
                const randomDevice = mockDevices[Math.floor(Math.random() * mockDevices.length)];
                const isCritical = Math.random() > 0.7;
                const threat = {
                    id: `threat-${Date.now()}`,
                    deviceId: randomDevice.id,
                    deviceName: randomDevice.name,
                    type: Math.random() > 0.5 ? 'Brute Force' : 'DDoS',
                    severity: isCritical ? SEVERITY.CRITICAL : SEVERITY.HIGH,
                    timestamp: new Date().toISOString(),
                };

                setLastThreat(threat);

                if (alertContextRef.current) {
                    if (isCritical) {
                        alertContextRef.current.addCriticalAlert({ ...threat, message: 'CRITICAL THREAT DETECTED' });
                        setCompromisedDevice({ device: randomDevice, alertId: threat.id, threatType: threat.type });
                    }
                    alertContextRef.current.addNotification({ ...threat, message: `New threat on ${threat.deviceName}` });
                }
            }, 45000);

            return () => {
                clearInterval(telemetryInterval);
                clearInterval(threatInterval);
            };
        }
    }, []); // ← empty dep array: socket is created ONCE and never torn down due to state changes

    const value = {
        isConnected,
        lastThreat,
        liveFeedEntries,
        deviceStatusUpdates,
        compromisedDevice,
        resolvedIncident,
        liveMetrics,
        sensorReadings,
        socket: socketRef.current,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

// ── Hook for consuming components ─────────────────────────────────────────────
export const useWebSocket = () => {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error('useWebSocket must be used inside <WebSocketProvider>');
    return ctx;
};
