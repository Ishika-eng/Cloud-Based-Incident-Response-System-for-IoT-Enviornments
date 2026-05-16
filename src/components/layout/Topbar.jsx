import React from 'react';
import AlertBell from './AlertBell';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import TimeRangeSelector from '../ui/TimeRangeSelector';
import { useTimeRange } from '../../hooks/useTimeRange';

const Topbar = ({ isSidebarCollapsed }) => {
    const location = useLocation();
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useTimeRange('7d');

    const isAnalytics = location.pathname.includes('analytics');

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        const stripped = path.slice(1);
        return stripped.charAt(0).toUpperCase() + stripped.slice(1);
    };

    return (
        <header className="h-[56px] flex items-center justify-between px-8 sticky top-0 z-30 transition-all duration-300" style={{ backgroundColor: '#09090b', borderBottom: '1px solid #27272a' }}>
            <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.6)]" style={{ borderRadius: '0' }} />
                <h1 className="text-[20px] font-black font-mono text-white tracking-widest uppercase">
                    <span className="text-[#00ff41] opacity-70">/sys/</span>{getPageTitle().toLowerCase()}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                {isAnalytics && (
                    <div className="hidden sm:block">
                        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                    </div>
                )}
                <AlertBell />
                <div className="w-8 h-8 border border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41] flex items-center justify-center text-[12px] font-bold font-mono shrink-0 shadow-[0_0_8px_rgba(0,255,65,0.2)]" style={{ borderRadius: '0' }}>
                    {user?.name?.charAt(0) || 'A'}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
