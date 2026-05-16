import React, { useState, useEffect } from 'react';
import { getDevices } from '../services/api';
import Card from '../components/ui/Card';
import DeviceTable from '../components/devices/DeviceTable';
import DeviceDrawer from '../components/devices/DeviceDrawer';
import { useLiveFeed } from '../hooks/useLiveFeed';
import { CountBadge } from '../components/ui/Badge';
import { Search } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/ui/Toast';
import AddDeviceModal from '../components/devices/AddDeviceModal';

const Devices = () => {
    const { isAdmin } = useAuth();
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
    const { deviceStatusUpdates } = useLiveFeed();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const loadDevices = async () => {
        try {
            const res = await getDevices();
            setDevices(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadDevices();
    }, []);

    useEffect(() => {
        if (!deviceStatusUpdates?.device) return;
        setDevices(prev =>
            prev.map(d =>
                d.id === deviceStatusUpdates.device.id
                    ? { ...d, status: deviceStatusUpdates.device.status }
                    : d
            )
        );
        if (selectedDevice?.id === deviceStatusUpdates.device.id) {
            setSelectedDevice(prev => ({ ...prev, status: deviceStatusUpdates.device.status }));
        }
    }, [deviceStatusUpdates]);

    const filteredDevices = devices.filter(d => {
        const q = search.toLowerCase();
        const matchesSearch = q === '' ||
            d.name.toLowerCase().includes(q) ||
            (d.ip || d.ipAddress || '').toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q);
        const matchesStatus = statusFilter === '' || d.status === statusFilter;
        const matchesType = typeFilter === '' || d.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const uniqueTypes = [...new Set(devices.map(d => d.type))];
    const uniqueStatuses = [...new Set(devices.map(d => d.status))];

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-wide">Devices</h1>
                    <CountBadge count={devices.length} />
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsAddDeviceOpen(true)}
                        className="bg-[#00ff41]/10 border border-[#00ff41] hover:bg-[#00ff41] text-[#00ff41] hover:text-black h-[32px] px-[14px] text-[13px] font-mono font-bold uppercase tracking-wider transition-all focus:outline-none shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                        style={{ borderRadius: '0' }}
                    >
                        + Initialize
                    </button>
                )}
            </div>

            <Card className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-[var(--border-default)] flex gap-3 bg-[#161b22] shrink-0">
                    <div className="relative w-64 shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name or IP..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full !h-[32px] pl-8 pr-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd] transition-colors"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="!h-[32px] px-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd]"
                    >
                        <option value="">All Statuses</option>
                        {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="!h-[32px] px-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd]"
                    >
                        <option value="">All Types</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex-1 overflow-auto">
                    <DeviceTable devices={filteredDevices} onView={(d) => setSelectedDevice(d)} />
                </div>
            </Card>

            <DeviceDrawer
                device={selectedDevice}
                isOpen={!!selectedDevice}
                onClose={() => setSelectedDevice(null)}
                onRefresh={loadDevices}
            />

            <AddDeviceModal
                isOpen={isAddDeviceOpen}
                onClose={() => setIsAddDeviceOpen(false)}
                onRefresh={loadDevices}
            />
        </div>
    );
};

export default Devices;
