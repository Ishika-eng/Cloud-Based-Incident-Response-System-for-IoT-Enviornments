import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, Server, AlertTriangle, BarChart2, Map, Settings, ArrowRight } from 'lucide-react';
import { getDevices, getIncidents } from '../../services/api';
import { ROUTES } from '../../constants/routes';

const PAGES = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard, category: 'Navigation' },
    { label: 'Devices', path: ROUTES.DEVICES, icon: Server, category: 'Navigation' },
    { label: 'Incidents', path: ROUTES.INCIDENTS, icon: AlertTriangle, category: 'Navigation' },
    { label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart2, category: 'Navigation' },
    { label: 'Threat Map', path: ROUTES.THREATMAP, icon: Map, category: 'Navigation' },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings, category: 'Navigation' },
];

const fuseMatch = (query, text) =>
    text.toLowerCase().includes(query.toLowerCase());

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [devices, setDevices] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        getDevices().then(r => setDevices(r.data)).catch(() => { });
        getIncidents().then(r => setIncidents(r.data)).catch(() => { });
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    }, [isOpen]);

    useEffect(() => {
        setActiveIdx(0);
        if (!query.trim()) {
            setResults(PAGES.map(p => ({ ...p, type: 'page' })));
            return;
        }

        const pageResults = PAGES
            .filter(p => fuseMatch(query, p.label))
            .map(p => ({ ...p, type: 'page' }));

        const deviceResults = devices
            .filter(d => fuseMatch(query, d.name) || fuseMatch(query, d.ip) || fuseMatch(query, d.type))
            .slice(0, 4)
            .map(d => ({
                label: d.name,
                sublabel: `${d.ip} · ${d.type}`,
                path: ROUTES.DEVICES,
                icon: Server,
                category: 'Devices',
                type: 'device',
                status: d.status,
            }));

        const incidentResults = incidents
            .filter(i => fuseMatch(query, i.type) || fuseMatch(query, i.deviceName) || fuseMatch(query, i.id))
            .slice(0, 4)
            .map(i => ({
                label: `${i.type} — ${i.deviceName}`,
                sublabel: i.id + ' · ' + i.severity,
                path: ROUTES.INCIDENTS,
                icon: AlertTriangle,
                category: 'Incidents',
                type: 'incident',
                severity: i.severity,
            }));

        setResults([...pageResults, ...deviceResults, ...incidentResults]);
    }, [query, devices, incidents]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && results[activeIdx]) {
            navigate(results[activeIdx].path);
            setIsOpen(false);
        }
    };

    const severityColor = (sev) => {
        if (sev === 'critical') return '#f85149';
        if (sev === 'high') return '#e3782c';
        if (sev === 'medium') return '#d29922';
        return '#388bfd';
    };

    const statusColor = (status) => {
        if (status === 'Active') return '#3fb950';
        if (status === 'Compromised') return '#f85149';
        if (status === 'Blocked') return '#d29922';
        return '#6e7681';
    };

    if (!isOpen) return null;

    // Group results by category
    const grouped = results.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    let flatIdx = 0;
    const groupedEntries = Object.entries(grouped);

    return (
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-24 px-4" onClick={() => setIsOpen(false)}>
            <div
                className="w-full max-w-[600px] bg-[#09090b] border border-[#27272a] shadow-2xl overflow-hidden"
                style={{ borderRadius: '0' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 border-b border-[#27272a] h-14">
                    <Search size={18} className="text-[#00ff41] shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.5))' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search devices, incidents, pages..."
                        className="flex-1 bg-transparent text-[14px] font-mono text-[#e6edf3] placeholder-[#52525b] focus:outline-none"
                    />
                    <kbd className="text-[10px] font-mono text-[#52525b] border border-[#27272a] px-2 py-0.5">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto py-2">
                    {results.length === 0 && (
                        <div className="text-center text-[13px] font-mono text-[#52525b] py-10">
                            No results for "{query}"
                        </div>
                    )}

                    {groupedEntries.map(([category, items]) => (
                        <div key={category}>
                            <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#00ff41] opacity-70 border-b border-[#18181b]">
                                {category}
                            </div>
                            {items.map((item) => {
                                const isActive = flatIdx === activeIdx;
                                const currentIdx = flatIdx++;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={currentIdx}
                                        className="w-full flex items-center gap-4 px-4 h-[52px] transition-colors text-left"
                                        style={{
                                            backgroundColor: isActive ? 'rgba(0,255,65,0.08)' : 'transparent',
                                            borderLeft: isActive ? '3px solid #00ff41' : '3px solid transparent',
                                        }}
                                        onMouseEnter={() => setActiveIdx(currentIdx)}
                                        onClick={() => { navigate(item.path); setIsOpen(false); }}
                                    >
                                        <Icon size={16} className="shrink-0" style={{ color: isActive ? '#00ff41' : '#52525b' }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] font-mono text-[#e6edf3] truncate">{item.label}</div>
                                            {item.sublabel && (
                                                <div className="text-[11px] font-mono truncate" style={{
                                                    color: item.severity ? severityColor(item.severity)
                                                        : item.status ? statusColor(item.status)
                                                            : '#52525b'
                                                }}>
                                                    {item.sublabel}
                                                </div>
                                            )}
                                        </div>
                                        {isActive && <ArrowRight size={14} className="text-[#00ff41] shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-[#27272a] px-4 py-2 flex items-center gap-4 text-[11px] font-mono text-[#52525b]">
                    <span><kbd className="border border-[#27272a] px-1.5 py-0.5 mr-1.5">↑↓</kbd>Navigate</span>
                    <span><kbd className="border border-[#27272a] px-1.5 py-0.5 mr-1.5">↵</kbd>Open</span>
                    <span><kbd className="border border-[#27272a] px-1.5 py-0.5 mr-1.5">Ctrl+K</kbd>Toggle</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
