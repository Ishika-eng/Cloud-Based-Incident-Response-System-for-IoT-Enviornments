import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import DeviceStatusDot from './DeviceStatusDot';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { DEVICE_STATUS } from '../../constants/deviceTypes';
import { blockDevice, unblockDevice, getIncidents, getDeviceTelemetry } from '../../services/api';
import { toast } from '../ui/Toast';
import { safeFormat } from '../../utils/dateFormat';

const DeviceDrawer = ({ device, isOpen, onClose, onRefresh }) => {
    const { isAdmin } = useAuth();
    const [isConfirming, setIsConfirming] = useState(false);
    const [incidents, setIncidents] = useState([]);
    const [telemetry, setTelemetry] = useState([]);

    useEffect(() => {
        if (device && isOpen) {
            setIsConfirming(false);
            getIncidents().then(res => {
                const filtered = res.data.filter(i => i.deviceId === device.id).slice(0, 5);
                setIncidents(filtered);
            });
            getDeviceTelemetry(device.id).then(res => setTelemetry(res.data));
        }
    }, [device, isOpen]);

    if (!isOpen || !device) return null;

    const handleBlockUnblock = async () => {
        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }

        try {
            if (device.status === DEVICE_STATUS.BLOCKED) {
                await unblockDevice(device.id);
                toast.success(`Device unblocked successfully`);
            } else {
                await blockDevice(device.id);
                toast.success(`Device blocked successfully`);
            }
            setIsConfirming(false);
            onRefresh();
            onClose();
        } catch (err) {
            toast.error('Failed to update device status');
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

                <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <DeviceStatusDot status={device.status} />
                        <h2 className="text-15px font-medium text-[var(--text-primary)]">{device.name}</h2>
                        <span className="text-11px px-2 py-0.5 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] uppercase">
                            {device.status}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    <section>
                        <h3 className="text-11px uppercase font-medium text-[var(--text-secondary)] mb-3 tracking-wider flex items-center gap-2">
                            <ServerIcon /> Device Identity & Network
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div>
                                <div className="text-11px text-[var(--text-muted)] mb-1">Type</div>
                                <div className="text-13px text-[var(--text-primary)]">{device.type}</div>
                            </div>
                            <div>
                                <div className="text-11px text-[var(--text-muted)] mb-1">IP Address</div>
                                <div className="text-13px text-[var(--text-primary)] font-mono">{device.ip}</div>
                            </div>
                            <div>
                                <div className="text-11px text-[var(--text-muted)] mb-1">Location</div>
                                <div className="text-13px text-[var(--text-primary)]">{device.location}</div>
                            </div>
                            <div>
                                <div className="text-11px text-[var(--text-muted)] mb-1">Firmware Version</div>
                                <div className="text-13px text-[var(--text-primary)] font-mono">{device.firmwareVersion}</div>
                            </div>
                            <div>
                                <div className="text-11px text-[var(--text-muted)] mb-1">Uptime</div>
                                <div className="text-13px text-[var(--text-primary)]">{device.uptimeDays} days</div>
                            </div>
                            <div>
                                <div className="text-11px text-[var(--text-muted)] mb-1">Last Seen</div>
                                <div className="text-13px text-[var(--text-primary)] font-mono">{safeFormat(device.lastSeen, 'MMM dd, HH:mm:ss')}</div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-11px uppercase font-medium text-[var(--text-secondary)] mb-3 tracking-wider flex items-center gap-2">
                            <Activity size={14} /> Live Telemetry
                        </h3>
                        <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] p-2 h-[120px]">
                            {telemetry.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={telemetry}>
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 0, fontSize: 11, fontFamily: 'monospace' }}
                                            labelFormatter={(val) => safeFormat(val, 'HH:mm')}
                                            formatter={(val, name) => [`${Math.round(val)}%`, name.toUpperCase()]}
                                        />
                                        <Line type="monotone" dataKey="cpu" stroke="#00ff41" strokeWidth={1.5} dot={false} name="CPU" />
                                        <Line type="monotone" dataKey="network" stroke="#388bfd" strokeWidth={1.5} dot={false} name="Network" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-11px text-[var(--text-muted)]">Loading...</div>
                            )}
                        </div>
                        <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono"><span className="w-2 h-0.5 bg-[#00ff41] inline-block" /> CPU</div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono"><span className="w-2 h-0.5 bg-[#388bfd] inline-block" /> Network</div>
                        </div>
                    </section>

                    <section>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-11px uppercase font-medium text-[var(--text-secondary)] tracking-wider">Recent Incidents</h3>
                            <span className="text-11px bg-[var(--bg-elevated)] px-1.5 rounded-[4px] border border-[var(--border-default)]">{device.totalIncidents} total</span>
                        </div>

                        {incidents.length === 0 ? (
                            <div className="text-13px text-[var(--text-muted)] py-4 text-center border border-dashed border-[var(--border-default)] rounded-[6px]">
                                No recent incidents
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {incidents.map(inc => (
                                    <div key={inc.id} className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[6px] flex flex-col gap-1.5 hover:border-[var(--border-muted)] transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-13px font-medium text-[var(--text-primary)]">{inc.type}</span>
                                            <span className="text-11px font-mono text-[var(--text-muted)]">{safeFormat(inc.timestamp, 'MMM dd')}</span>
                                        </div>
                                        <div className="text-11px text-[var(--text-secondary)] truncate">{inc.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>

                {isAdmin && (
                    <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0 flex justify-end gap-3">
                        {isConfirming ? (
                            <>
                                <span className="flex items-center text-13px text-[var(--text-danger)] mr-auto ml-2 font-medium">Are you sure?</span>
                                <Button variant="ghost" onClick={() => setIsConfirming(false)}>Cancel</Button>
                                <Button variant="danger" onClick={handleBlockUnblock}>
                                    Confirm {device.status === DEVICE_STATUS.BLOCKED ? 'Unblock' : 'Block'}
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant={device.status === DEVICE_STATUS.BLOCKED ? 'secondary' : 'danger'}
                                onClick={handleBlockUnblock}
                                className="w-full flex justify-center gap-2 items-center"
                            >
                                {device.status === DEVICE_STATUS.BLOCKED ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                {device.status === DEVICE_STATUS.BLOCKED ? 'Unblock Device Request' : 'Network Block Device'}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

const ServerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
);

export default DeviceDrawer;
