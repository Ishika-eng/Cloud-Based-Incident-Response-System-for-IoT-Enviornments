import React, { useContext } from 'react';
import { AlertContext } from '../../context/AlertContext';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { formatDistanceToNow } from 'date-fns';
import { StatusDot } from '../ui/Badge';
import { SEVERITY_COLORS } from '../../constants/severity';

const NotificationPanel = ({ isOpen, onClose, anchorRef }) => {
    const { notifications, markAllRead } = useContext(AlertContext);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose}></div>
            <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[80vh] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl rounded-[6px] z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden sm:mr-4">
                <div className="px-4 py-3 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--bg-elevated)] shrink-0">
                    <h3 className="font-medium text-[13px] text-[var(--text-primary)]">Notifications</h3>
                    <div className="flex gap-3 items-center">
                        {notifications.some(n => !n.read) && (
                            <button
                                onClick={markAllRead}
                                className="text-[11px] text-[var(--text-link)] hover:underline font-medium focus:outline-none"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center pt-12 pb-12">
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
                                <CheckCircle className="text-[var(--safe)]" size={20} />
                            </div>
                            <p className="text-[13px] text-[var(--text-primary)] font-medium mb-1">No new notifications</p>
                            <p className="text-[11px] text-[var(--text-muted)]">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`p-3 border-b border-[var(--border-default)] flex gap-3 items-start transition-colors ${notif.read ? 'opacity-70 bg-[var(--bg-base)]' : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <div className="mt-1 shrink-0">
                                        <StatusDot color={SEVERITY_COLORS[notif.severity]} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <span className="font-bold text-[11px] text-[var(--text-primary)] truncate pr-2 font-mono">{notif.deviceName}</span>
                                            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap shrink-0">{formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-snug">
                                            {notif.message || notif.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0 text-center">
                    <Link to={ROUTES.INCIDENTS} onClick={onClose} className="text-[11px] text-[var(--text-link)] hover:underline font-medium inline-block py-1">
                        View all in Incidents →
                    </Link>
                </div>
            </div>
        </>
    );
};

export default NotificationPanel;
