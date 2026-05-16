import React, { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { Globe, Zap } from 'lucide-react';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Mock attack data with real coordinates
const MOCK_ATTACKS = [
    { id: 1, origin: [37.6, 55.7], label: 'Moscow, RU', type: 'Brute Force', severity: 'critical', count: 144 },
    { id: 2, origin: [116.4, 39.9], label: 'Beijing, CN', type: 'DDoS', severity: 'critical', count: 89 },
    { id: 3, origin: [-43.1, -22.9], label: 'Rio de Janeiro, BR', type: 'Port Scan', severity: 'medium', count: 12 },
    { id: 4, origin: [28.9, 41.0], label: 'Istanbul, TR', type: 'Brute Force', severity: 'high', count: 55 },
    { id: 5, origin: [2.3, 48.8], label: 'Paris, FR', type: 'Unauthorized', severity: 'high', count: 30 },
    { id: 6, origin: [103.8, 1.35], label: 'Singapore, SG', type: 'DDoS', severity: 'high', count: 72 },
    { id: 7, origin: [151.2, -33.8], label: 'Sydney, AU', type: 'Port Scan', severity: 'low', count: 8 },
    { id: 8, origin: [-99.1, 19.4], label: 'Mexico City, MX', type: 'Brute Force', severity: 'medium', count: 23 },
    { id: 9, origin: [18.4, 59.3], label: 'Stockholm, SE', type: 'Unauthorized', severity: 'medium', count: 18 },
    { id: 10, origin: [72.8, 18.9], label: 'Mumbai, IN', type: 'DDoS', severity: 'critical', count: 201 },
    { id: 11, origin: [139.7, 35.6], label: 'Tokyo, JP', type: 'Port Scan', severity: 'high', count: 47 },
    { id: 12, origin: [31.2, 30.0], label: 'Cairo, EG', type: 'Brute Force', severity: 'high', count: 61 },
];

// Home server location (center target)
const HOME = [-95.7, 37.0]; // Central USA

const SEVERITY_COLORS = {
    critical: '#f85149',
    high: '#e3782c',
    medium: '#d29922',
    low: '#388bfd',
};

// Animated arc between origin and home
const AnimatedArc = ({ from, to, color, duration, delay }) => {
    const [progress, setProgress] = useState(0);
    const animRef = useRef(null);
    const startTime = useRef(null);

    useEffect(() => {
        const elapsed = delay;
        const animate = (timestamp) => {
            if (!startTime.current) startTime.current = timestamp - elapsed;
            const t = ((timestamp - startTime.current) % (duration + delay)) / duration;
            setProgress(Math.max(0, Math.min(1, t)));
            animRef.current = requestAnimationFrame(animate);
        };
        const delayTimer = setTimeout(() => {
            animRef.current = requestAnimationFrame(animate);
        }, delay);
        return () => {
            clearTimeout(delayTimer);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [duration, delay]);

    return (
        <Line
            from={from}
            to={to}
            stroke={color}
            strokeWidth={1}
            strokeLinecap="round"
            strokeDasharray="4,3"
            strokeDashoffset={-(progress * 100)}
            strokeOpacity={0.8}
        />
    );
};

// Pulsing dot
const PulsingDot = ({ coordinates, color }) => {
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const interval = setInterval(() => {
            setScale(s => s === 1 ? 1.8 : 1);
        }, 1000 + Math.random() * 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <Marker coordinates={coordinates}>
            <circle r={6} fill={color} opacity={0.15} style={{ transform: `scale(${scale})`, transition: 'transform 0.6s ease', transformOrigin: 'center' }} />
            <circle r={3} fill={color} opacity={0.9} />
        </Marker>
    );
};

const ThreatMap = () => {
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');

    const filteredAttacks = filter === 'all'
        ? MOCK_ATTACKS
        : MOCK_ATTACKS.filter(a => a.severity === filter);

    const totalAttacks = MOCK_ATTACKS.reduce((s, a) => s + a.count, 0);
    const severityCounts = MOCK_ATTACKS.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: '#09090b' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.6)]" style={{ borderRadius: '0' }} />
                    <h1 className="text-[20px] font-black font-mono text-white tracking-widest uppercase">
                        <span className="text-[#00ff41] opacity-70">/sys/</span>threatmap
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex h-[30px] items-center gap-1 border border-[#27272a] px-1">
                        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className="px-3 h-[24px] text-[11px] font-mono uppercase tracking-wider transition-colors"
                                style={{
                                    backgroundColor: filter === f ? '#00ff41' : 'transparent',
                                    color: filter === f ? '#09090b' : '#52525b',
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 border-b border-[#27272a] shrink-0">
                {[
                    { label: 'Total Attacks', value: totalAttacks, color: '#e6edf3' },
                    { label: 'Critical', value: severityCounts.critical || 0, color: '#f85149' },
                    { label: 'Active Sources', value: filteredAttacks.length, color: '#00ff41' },
                    { label: 'High Priority', value: severityCounts.high || 0, color: '#e3782c' },
                ].map(stat => (
                    <div key={stat.label} className="px-6 py-3 border-r border-[#27272a] last:border-r-0">
                        <div className="text-[11px] font-mono uppercase tracking-widest text-[#52525b]">{stat.label}</div>
                        <div className="text-[24px] font-black font-mono" style={{ color: stat.color }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Map + Attack List */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Map */}
                <div className="flex-1 relative">
                    <ComposableMap
                        projection="geoNaturalEarth1"
                        style={{ width: '100%', height: '100%', backgroundColor: '#09090b' }}
                        projectionConfig={{ scale: 140 }}
                    >
                        <Geographies geography={GEO_URL}>
                            {({ geographies }) =>
                                geographies.map(geo => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        style={{
                                            default: { fill: '#18181b', stroke: '#27272a', strokeWidth: 0.5, outline: 'none' },
                                            hover: { fill: '#27272a', outline: 'none' },
                                            pressed: { outline: 'none' },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>

                        {/* Attack arcs */}
                        {filteredAttacks.map((atk, i) => (
                            <AnimatedArc
                                key={atk.id}
                                from={atk.origin}
                                to={HOME}
                                color={SEVERITY_COLORS[atk.severity]}
                                duration={3000 + i * 200}
                                delay={i * 400}
                            />
                        ))}

                        {/* Attack origin dots */}
                        {filteredAttacks.map(atk => (
                            <PulsingDot
                                key={atk.id}
                                coordinates={atk.origin}
                                color={SEVERITY_COLORS[atk.severity]}
                            />
                        ))}

                        {/* Home server */}
                        <Marker coordinates={HOME}>
                            <circle r={10} fill="#09090b" stroke="#00ff41" strokeWidth={2} />
                            <circle r={5} fill="#00ff41" style={{ filter: 'drop-shadow(0 0 8px #00ff41)' }} />
                        </Marker>
                    </ComposableMap>

                    {/* Home legend */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-mono text-[#00ff41] flex items-center gap-2 bg-[#09090b] border border-[#00ff41] px-4 py-1.5 shadow-[0_0_12px_rgba(0,255,65,0.2)]" style={{ borderRadius: '0' }}>
                        <Globe size={12} /> HOME SERVER — PROTECTED ZONE
                    </div>
                </div>

                {/* Attack Feed List */}
                <div className="w-[280px] border-l border-[#27272a] flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b border-[#27272a] text-[11px] font-mono uppercase tracking-widest text-[#00ff41] opacity-70 flex items-center gap-2">
                        <Zap size={11} /> Live Attack Feed
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredAttacks.map(atk => (
                            <button
                                key={atk.id}
                                onClick={() => setSelected(selected?.id === atk.id ? null : atk)}
                                className="w-full p-3 border-b border-[#18181b] text-left transition-colors hover:bg-[#18181b]"
                                style={{
                                    borderLeft: selected?.id === atk.id ? `3px solid ${SEVERITY_COLORS[atk.severity]}` : '3px solid transparent',
                                    backgroundColor: selected?.id === atk.id ? 'rgba(0,0,0,0.3)' : 'transparent',
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-mono font-bold uppercase" style={{ color: SEVERITY_COLORS[atk.severity] }}>
                                        {atk.severity}
                                    </span>
                                    <span className="text-[11px] font-mono text-[#52525b]">{atk.count} hits</span>
                                </div>
                                <div className="text-[13px] font-mono text-[#e6edf3] truncate">{atk.type}</div>
                                <div className="text-[11px] font-mono text-[#52525b] truncate">{atk.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThreatMap;
