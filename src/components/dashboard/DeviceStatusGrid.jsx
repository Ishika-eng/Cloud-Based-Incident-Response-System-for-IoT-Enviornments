import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import { getDevices } from '../../services/api';
import { DEVICE_STATUS_COLORS } from '../../constants/deviceTypes';
import { ROUTES } from '../../constants/routes';
import { useLiveFeed } from '../../hooks/useLiveFeed';

const DeviceStatusGrid = () => {
    const [devices, setDevices] = useState([]);
    const { deviceStatusUpdates } = useLiveFeed();

    useEffect(() => {
        getDevices().then(res => setDevices(res.data.slice(0, 16)));
    }, []);

    useEffect(() => {
        if (!deviceStatusUpdates) return;
        setDevices(prev =>
            prev.map(d =>
                d.id === deviceStatusUpdates.device?.id
                    ? { ...d, status: deviceStatusUpdates.device.status }
                    : d
            )
        );
    }, [deviceStatusUpdates]);

    return (
        <Card className="flex-1 flex flex-col min-h-[220px]">
            <div className="px-4 py-3 border-b border-[var(--border-default)] shrink-0 flex justify-between items-center">
                <h3 className="font-medium text-[var(--text-primary)] text-13px">Device Status</h3>
                <span className="text-11px text-[var(--text-muted)]">{devices.length} Monitored</span>
            </div>
            <div className="flex-1 p-3 flex flex-col">
                <div className="flex flex-col h-full content-start">
                    {devices.slice(0, 8).map(device => (
                        <div key={device.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid #21262d' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: DEVICE_STATUS_COLORS[device.status], flexShrink: 0 }} />
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#e6edf3', flex: 1 }}>{device.name}</span>
                            <span style={{ fontSize: 11, color: DEVICE_STATUS_COLORS[device.status] }}>{device.status}</span>
                        </div>
                    ))}
                    <div className="mt-auto pt-3">
                        <Link to={ROUTES.DEVICES} className="text-[11px] text-[#388bfd] hover:underline font-medium">View all →</Link>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default DeviceStatusGrid;
