import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Terminal, LayoutDashboard, Server, AlertTriangle, BarChart2, Settings, ChevronLeft, ChevronRight, LogOut, Map, Activity } from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Devices', path: ROUTES.DEVICES, icon: Server },
    { label: 'Incidents', path: ROUTES.INCIDENTS, icon: AlertTriangle },
    { label: 'Live Monitor', path: ROUTES.LIVE_MONITOR, icon: Activity },
    { label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart2 },
    { label: 'Threat Map', path: ROUTES.THREATMAP, icon: Map },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
    const { user, logout } = useAuth();

    const widthClass = isCollapsed ? 'w-[60px]' : 'w-[240px]';

    return (
        <aside className={`fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out flex flex-col z-40 ${widthClass}`} style={{ backgroundColor: '#09090b', borderRight: '1px solid #27272a' }}>
            <div className="flex items-center h-16 px-4 border-b border-[#27272a] shrink-0 overflow-hidden text-[#e6edf3] relative bg-[#09090b]">
                <Terminal className="shrink-0 text-[#00ff41]" size={26} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,65,0.4))' }} />
                <span className={`ml-4 font-black font-mono text-[16px] tracking-widest text-white uppercase transition-opacity duration-300 whitespace-nowrap glitch animate-flicker ${isCollapsed ? 'opacity-0' : 'opacity-100'}`} data-text="ThreatNest">
                    ThreatNest
                </span>
            </div>

            <nav className="flex-1 py-6 flex flex-col gap-2 overflow-x-hidden px-2">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === ROUTES.DASHBOARD}
                        title={isCollapsed ? item.label : ''}
                        style={({ isActive }) => ({
                            backgroundColor: isActive ? '#00ff41' : 'transparent',
                            color: isActive ? '#09090b' : '#8b949e',
                            paddingLeft: '12px',
                            fontWeight: isActive ? '800' : '500'
                        })}
                        className="flex items-center h-[42px] transition-colors hover:bg-[#27272a] hover:text-[#00ff41] rounded-none"
                    >
                        <item.icon size={20} className="shrink-0" strokeWidth={isCollapsed ? 2.5 : 2} />
                        <span className={`ml-4 text-[14px] font-mono whitespace-nowrap uppercase tracking-wide transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100 block'}`}>
                            {item.label}
                        </span>
                    </NavLink>
                ))}
                {!isCollapsed && (
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); }}
                            className="w-full flex items-center justify-between text-[10px] font-mono text-[#52525b] hover:text-[#00ff41] border border-[#27272a] hover:border-[#00ff41]/30 px-3 py-2 transition-all"
                            style={{ borderRadius: '0' }}
                        >
                            <span>Search...</span>
                            <kbd className="text-[9px] border border-[#27272a] px-1.5 py-0.5">Ctrl K</kbd>
                        </button>
                    </div>
                )}
            </nav>

            <div className="mt-auto border-t border-[#27272a] shrink-0 overflow-hidden bg-[#09090b]">
                <div className={`p-4 flex items-center h-[68px] ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-9 h-9 border border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41] flex items-center justify-center text-13px font-bold font-mono shrink-0 shadow-[0_0_8px_rgba(0,255,65,0.2)]" style={{ borderRadius: '0' }}>
                        {user?.name?.charAt(0) || 'A'}
                    </div>
                    {!isCollapsed && (
                        <div className="ml-4 flex-1 min-w-0">
                            <div className="text-[13px] font-bold text-[#e6edf3] font-mono uppercase truncate">{user?.name}</div>
                            <div className="text-[11px] text-[#00ff41] font-mono tracking-widest truncate">{user?.role}</div>
                        </div>
                    )}
                    {!isCollapsed && (
                        <button onClick={logout} className="text-[#a1a1aa] hover:text-[#00ff41] shrink-0 ml-2 transition-colors" title="Logout">
                            <LogOut size={18} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center h-12 border-t border-[#27272a] text-[#00ff41] hover:bg-[#00ff41]/10 transition-colors"
                    aria-label="Toggle Sidebar"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
