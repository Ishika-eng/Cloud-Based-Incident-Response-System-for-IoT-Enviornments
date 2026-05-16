import React, { useContext, useEffect, useState } from 'react';
import { AlertContext } from '../../context/AlertContext';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const Banner = ({ alert, onDismiss }) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const duration = 10000;
        const intervalTime = 100;
        const step = (intervalTime / duration) * 100;

        const interval = setInterval(() => {
            setProgress(p => Math.max(0, p - step));
        }, intervalTime);

        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -48, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 48 }}
            exit={{ opacity: 0, y: -48, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-[var(--critical)] text-white relative z-[60] overflow-hidden shadow-md flex items-center justify-center shrink-0 border-b border-red-800"
        >
            <div className="flex items-center gap-4 px-6 w-full max-w-7xl mx-auto h-full">
                <AlertCircle size={20} className="shrink-0" />
                <span className="font-bold tracking-widest text-[13px] uppercase shrink-0">Critical Threat Detected</span>
                <div className="h-4 w-px bg-white/30 shrink-0"></div>
                <span className="font-mono text-[12px] shrink-0 font-medium">{alert.deviceName}</span>
                <div className="h-4 w-px bg-white/30 shrink-0 hidden sm:block"></div>
                <span className="text-[12px] font-medium opacity-90 truncate hidden sm:block">{alert.type}</span>
                <div className="flex-1"></div>
                <Link
                    to={ROUTES.INCIDENTS}
                    className="text-[12px] font-medium underline underline-offset-2 hover:text-white/80 transition-colors whitespace-nowrap"
                >
                    View Incident
                </Link>
                <button
                    onClick={() => onDismiss(alert.id)}
                    className="p-1 hover:bg-white/10 rounded-[4px] transition-colors shrink-0"
                >
                    <X size={18} />
                </button>
            </div>
            <div
                className="absolute bottom-0 left-0 h-[3px] bg-white/40"
                style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
            ></div>
        </motion.div>
    );
};

const CriticalAlertBanner = () => {
    const { criticalAlerts, removeCriticalAlert } = useContext(AlertContext);

    if (!criticalAlerts || criticalAlerts.length === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[60] flex flex-col">
            <AnimatePresence>
                {criticalAlerts.map(alert => (
                    <Banner
                        key={alert.id}
                        alert={alert}
                        onDismiss={removeCriticalAlert}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default CriticalAlertBanner;
