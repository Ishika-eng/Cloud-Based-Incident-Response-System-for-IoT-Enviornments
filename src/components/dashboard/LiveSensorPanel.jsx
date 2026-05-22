import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Droplets, Wind, Eye, EyeOff, Activity } from 'lucide-react';
import Card from '../ui/Card';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { getDevices } from '../../services/api';

const secondsAgo = (iso) => {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5)  return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
};

const SensorRow = ({ icon: Icon, label, value, unit, colour = 'var(--text-primary)' }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-muted)] last:border-0">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <Icon size={12} className="shrink-0" style={{ color: colour }} />
            {label}
        </div>
        <span className="text-[12px] font-mono font-medium" style={{ color: colour }}>
            {value !== undefined && value !== null ? `${value}${unit}` : '—'}
        </span>
    </div>
);

const DeviceCard = ({ deviceId, reading }) => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(p => p + 1), 5000);
        return () => clearInterval(t);
    }, []);

    const temp     = reading.temperature;
    const humidity = reading.humidity;
    const gas      = reading.gasValue;
    const motion   = reading.motion;

    const tempColour = temp > 40 ? 'var(--critical)' : temp > 35 ? '#d29922' : 'var(--chart-1)';
    const gasColour  = gas  > 2000 ? 'var(--critical)' : gas > 1500 ? '#d29922' : 'var(--text-primary)';

    return (
        <motion.div
            key={deviceId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-elevated)] rounded-[6px] p-3 border border-[var(--border-default)]"
        >
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-[12px] font-medium text-[var(--text-primary)] font-mono">
                        {reading.deviceName}
                    </div>
                    {reading.location && (
                        <div className="text-[10px] text-[var(--text-muted)]">{reading.location}</div>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                        {secondsAgo(reading.lastUpdated)}
                    </span>
                </div>
            </div>

            {temp     !== undefined && <SensorRow icon={Thermometer} label="Temperature" value={typeof temp === 'number' ? temp.toFixed(1) : temp} unit="°C" colour={tempColour} />}
            {humidity !== undefined && <SensorRow icon={Droplets}    label="Humidity"    value={typeof humidity === 'number' ? humidity.toFixed(1) : humidity} unit="%" colour="var(--chart-2, #60a5fa)" />}
            {gas      !== undefined && <SensorRow icon={Wind}        label="Gas Level"   value={gas}    unit="" colour={gasColour} />}
            {motion   !== undefined && (
                <SensorRow
                    icon={motion ? Eye : EyeOff}
                    label="Motion"
                    value={motion ? 'Detected' : 'Clear'}
                    unit=""
                    colour={motion ? '#d29922' : 'var(--text-secondary)'}
                />
            )}
        </motion.div>
    );
};

const LiveSensorPanel = () => {
    const { sensorReadings } = useLiveFeed();
    // Local state — seeded from REST on mount, then updated by Socket.IO
    const [readings, setReadings] = useState({});

    // On mount: load last known sensor data from /api/devices
    useEffect(() => {
        getDevices().then((res) => {
            const devices = res.data || [];
            const initial = {};
            devices.forEach((d) => {
                if (d.latestSensorData && Object.keys(d.latestSensorData).length > 0) {
                    initial[d.id] = {
                        deviceName:  d.name,
                        location:    d.location,
                        ...d.latestSensorData,
                        lastUpdated: d.latestSensorTimestamp || d.lastSeen,
                    };
                }
            });
            if (Object.keys(initial).length > 0) {
                setReadings(initial);
            }
        }).catch(() => {});
    }, []);

    // Merge live Socket.IO updates on top
    useEffect(() => {
        if (Object.keys(sensorReadings).length > 0) {
            setReadings((prev) => ({ ...prev, ...sensorReadings }));
        }
    }, [sensorReadings]);

    const entries = Object.entries(readings);

    return (
        <Card className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Activity size={13} className="text-[var(--chart-1)]" />
                    <h3 className="font-medium text-[var(--text-primary)] text-[13px]">Live Sensor Data</h3>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                    {entries.length} device{entries.length !== 1 ? 's' : ''} reporting
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                <AnimatePresence>
                    {entries.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                            <Activity size={24} className="text-[var(--text-muted)] mb-2 opacity-40" />
                            <p className="text-[11px] text-[var(--text-muted)]">Waiting for sensor data...</p>
                            <p className="text-[10px] text-[var(--text-muted)] opacity-60 mt-1">
                                Node 1 will appear here once it sends telemetry
                            </p>
                        </div>
                    ) : (
                        entries.map(([deviceId, reading]) => (
                            <DeviceCard key={deviceId} deviceId={deviceId} reading={reading} />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </Card>
    );
};

export default LiveSensorPanel;
