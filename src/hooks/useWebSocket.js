import { useState, useEffect, useContext, useRef } from 'react';
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

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastThreat, setLastThreat] = useState(null);
    const [liveFeedEntries, setLiveFeedEntries] = useState([]);
    const [deviceStatusUpdates, setDeviceStatusUpdates] = useState(null);
    const [compromisedDevice, setCompromisedDevice] = useState(null);
    const [resolvedIncident, setResolvedIncident] = useState(null);
    const [liveMetrics, setLiveMetrics] = useState({ cpu: 0, ram: 0, packets: 0 });

    const alertContext = useContext(AlertContext);
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

                if (alertContext) {
                    alertContext.addNotification({
                        ...entry,
                        message: `Threat detected on ${entry.deviceName}: ${entry.eventType}`,
                    });
                }
            });

            socket.on(SOCKET_EVENTS.DEVICE_COMPROMISED, (data) => {
                console.warn('[ThreatNest] DEVICE COMPROMISED:', data);
                setCompromisedDevice(data);

                if (alertContext) {
                    alertContext.addCriticalAlert({
                        id: data.alertId,
                        deviceName: data.device?.name || data.deviceId,
                        type: data.threatType || 'System Compromised',
                        severity: 'critical',
                        timestamp: data.timestamp,
                        message: 'CRITICAL THREAT DETECTED',
                    });
                }

                // Also push into live feed
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

                // Update device status
                setDeviceStatusUpdates({ type: 'compromised', device: { ...data.device, status: 'Blocked' } });
            });

            socket.on(SOCKET_EVENTS.LIVE_TELEMETRY, (data) => {
                const entry = {
                    id: `tel-${Date.now()}-${Math.random()}`,
                    deviceId: data.deviceId,
                    deviceName: data.device?.name || data.deviceId,
                    eventType: data.type || 'heartbeat',
                    severity: data.incidents?.length > 0 ? 'high' : 'low',
                    timestamp: data.timestamp || new Date().toISOString(),
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

                if (alertContext) {
                    if (isCritical) {
                        alertContext.addCriticalAlert({ ...threat, message: 'CRITICAL THREAT DETECTED' });
                        setCompromisedDevice({ device: randomDevice, alertId: threat.id, threatType: threat.type });
                    }
                    alertContext.addNotification({ ...threat, message: `New threat on ${threat.deviceName}` });
                }
            }, 45000);

            return () => {
                clearInterval(telemetryInterval);
                clearInterval(threatInterval);
            };
        }
    }, [alertContext]);

    return {
        isConnected,
        lastThreat,
        liveFeedEntries,
        deviceStatusUpdates,
        compromisedDevice,
        resolvedIncident,
        liveMetrics,
        socket: socketRef.current,
    };
};
