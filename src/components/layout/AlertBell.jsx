import React, { useContext, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { AlertContext } from '../../context/AlertContext';
import NotificationPanel from '../alerts/NotificationPanel';

const AlertBell = () => {
    const { notifications } = useContext(AlertContext);
    const [isOpen, setIsOpen] = useState(false);
    const bellRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <button
                ref={bellRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none rounded-[6px] hover:bg-[var(--bg-hover)]"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 w-2 h-2 bg-[var(--critical)] rounded-full animate-pulse border border-[var(--bg-surface)]"></span>
                )}
            </button>

            <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} anchorRef={bellRef} />
        </>
    );
};

export default AlertBell;
