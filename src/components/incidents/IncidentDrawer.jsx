import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import SeverityLabel from './SeverityLabel';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { resolveIncident, acknowledgeIncident } from '../../services/api';
import { toast } from '../ui/Toast';
import { safeFormat } from '../../utils/dateFormat';

const IncidentDrawer = ({ incident, isOpen, onClose, onRefresh }) => {
    const { isAdmin } = useAuth();
    const [isConfirmingResolve, setIsConfirmingResolve] = useState(false);
    const [isConfirmingAck, setIsConfirmingAck] = useState(false);

    if (!isOpen || !incident) return null;

    const handleResolve = async () => {
        if (!isConfirmingResolve) {
            setIsConfirmingResolve(true);
            return;
        }
        try {
            await resolveIncident(incident.incidentId || incident.id, 'Investigated and cleared by admin');
            toast.success(`Incident resolved`);
            setIsConfirmingResolve(false);
            onRefresh();
            onClose();
        } catch {
            toast.error('Failed to resolve incident');
        }
    };

    const handleAck = async () => {
        if (!isConfirmingAck) {
            setIsConfirmingAck(true);
            return;
        }
        try {
            await acknowledgeIncident(incident.id);
            toast.success(`Incident acknowledged`);
            setIsConfirmingAck(false);
            onRefresh();
        } catch {
            toast.error('Failed to acknowledge incident');
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

                <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-15px font-medium text-[var(--text-primary)] font-mono">{incident.id}</h2>
                        <SeverityLabel severity={incident.severity} />
                        <span className="text-11px px-2 py-0.5 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] uppercase tracking-wider">
                            {incident.status}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    <section>
                        <h3 className="text-11px uppercase font-medium text-[var(--text-secondary)] mb-3 tracking-wider">Description</h3>
                        <p className="text-13px text-[var(--text-primary)] leading-relaxed">
                            {incident.description}
                        </p>
                    </section>

                    <section>
                        <h3 className="text-11px uppercase font-medium text-[var(--text-secondary)] mb-3 tracking-wider">Attack Details</h3>
                        <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[6px] p-4">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                <div>
                                    <div className="text-11px text-[var(--text-muted)] mb-1">Source IP</div>
                                    <div className="text-13px text-[var(--text-primary)] font-mono">{incident.sourceIP}</div>
                                </div>
                                <div>
                                    <div className="text-11px text-[var(--text-muted)] mb-1">Target Port</div>
                                    <div className="text-13px text-[var(--text-primary)] font-mono">{incident.affectedPort}</div>
                                </div>
                                <div>
                                    <div className="text-11px text-[var(--text-muted)] mb-1">Affected Device</div>
                                    <div className="text-13px text-[var(--text-primary)] font-mono">{incident.deviceName}</div>
                                </div>
                                <div>
                                    <div className="text-11px text-[var(--text-muted)] mb-1">Timestamp</div>
                                    <div className="text-13px text-[var(--text-primary)] font-mono">{safeFormat(incident.timestamp, 'MMM dd, HH:mm:ss')}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-11px uppercase font-medium text-[var(--text-secondary)] mb-3 tracking-wider">Timeline</h3>
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[var(--border-default)]">
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-[12px] h-[12px] rounded-full border-2 border-[var(--border-default)] bg-[var(--text-muted)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-4 md:ml-0">
                                    <div className="text-11px font-mono text-[var(--text-muted)]">{safeFormat(incident.timestamp, 'HH:mm:ss')}</div>
                                    <div className="text-13px text-[var(--text-primary)]">Threat detected</div>
                                </div>
                            </div>
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-[12px] h-[12px] rounded-full border-2 border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-4 md:ml-0">
                                    <div className="text-11px font-mono text-[var(--text-muted)]">{safeFormat(new Date(new Date(incident.timestamp).getTime() + 5000), 'HH:mm:ss')}</div>
                                    <div className="text-13px text-[var(--text-primary)]">Automated analysis started</div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0 flex justify-end gap-3">
                    {incident.status === 'open' && (
                        isConfirmingAck ? (
                            <>
                                <span className="flex items-center text-13px text-[var(--text-secondary)] mr-auto ml-2">Confirm ACK?</span>
                                <Button variant="ghost" onClick={() => setIsConfirmingAck(false)}>Cancel</Button>
                                <Button variant="secondary" onClick={handleAck}>Confirm</Button>
                            </>
                        ) : (
                            <Button variant="secondary" onClick={handleAck}>
                                Acknowledge
                            </Button>
                        )
                    )}

                    {isAdmin && incident.status !== 'resolved' && (
                        isConfirmingResolve ? (
                            <>
                                <span className="flex items-center text-13px text-[var(--text-secondary)] mr-auto ml-2 font-medium">Confirm Resolve?</span>
                                <Button variant="ghost" onClick={() => setIsConfirmingResolve(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleResolve}>
                                    Resolve Now
                                </Button>
                            </>
                        ) : (
                            <Button variant="primary" onClick={handleResolve} className="flex justify-center flex-1 sm:flex-none gap-2 items-center">
                                <CheckCircle size={16} />
                                Mark Resolved
                            </Button>
                        )
                    )}
                </div>
            </div>
        </>
    );
};

export default IncidentDrawer;
