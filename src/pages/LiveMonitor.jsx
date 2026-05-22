import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { safeFormat } from '../utils/dateFormat';
import {
    Activity, Cpu, MemoryStick, Wifi, ShieldAlert, X,
    CheckCircle, Database, Server, Zap, AlertTriangle
} from 'lucide-react';
import { useLiveFeed } from '../hooks/useLiveFeed';
import { getHealth } from '../services/api';
import { SEVERITY_COLORS } from '../constants/severity';

// ── helpers ───────────────────────────────────────────────────────────────────
const MAX_POINTS = 60;

const useRollingData = (value, label, max = MAX_POINTS) => {
    const [series, setSeries] = useState(() =>
        Array.from({ length: max }, (_, i) => ({ t: `T-${max - i}`, v: 0 }))
    );
    useEffect(() => {
        setSeries(prev => {
            const next = [...prev.slice(1), { t: safeFormat(new Date(), 'HH:mm:ss'), v: value }];
            return next;
        });
    }, [value]);
    return series;
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, unit = '' }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#09090b] border border-[#27272a] px-3 py-2 font-mono text-[11px]">
            <p className="text-[#52525b] mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: <span className="text-[#e6edf3]">{p.value?.toFixed(1)}{unit}</span>
                </p>
            ))}
        </div>
    );
};

// ── Section reveal animation ──────────────────────────────────────────────────
const Reveal = ({ children, delay = 0 }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
};

// ── Live Chart Card ───────────────────────────────────────────────────────────
const LiveChartCard = ({ title, icon: Icon, data, dataKeys, colors, unit = '' }) => (
    <div className="bg-[#0d1117] border border-[#27272a] flex flex-col h-[220px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] shrink-0">
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-[#00ff41]" />
                <span className="font-mono text-[12px] uppercase tracking-widest text-[#e6edf3]">{title}</span>
            </div>
            <div className="flex items-center gap-3">
                {dataKeys.map((k, i) => (
                    <div key={k} className="flex items-center gap-1.5 text-[10px] font-mono text-[#52525b]">
                        <span className="w-6 h-[2px] inline-block" style={{ backgroundColor: colors[i] }} />
                        {k}
                    </div>
                ))}
            </div>
        </div>
        <div className="flex-1 p-3">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                    <defs>
                        {dataKeys.map((k, i) => (
                            <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[i]} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#1c2128" vertical={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 100]} stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#27272a' }} />
                    {dataKeys.map((k, i) => (
                        <Area
                            key={k}
                            type="monotone"
                            dataKey={`v${i}`}
                            name={k}
                            stroke={colors[i]}
                            strokeWidth={1.5}
                            fill={`url(#grad-${k})`}
                            isAnimationActive={false}
                            dot={false}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

// ── Stat Pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, unit = '', color = '#00ff41' }) => (
    <div className="border border-[#27272a] px-4 py-3 flex flex-col gap-1 bg-[#0d1117]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#52525b]">{label}</span>
        <span className="font-mono text-[26px] font-black leading-none" style={{ color }}>
            {value}<span className="text-[14px] font-normal text-[#52525b] ml-1">{unit}</span>
        </span>
    </div>
);

// ── Health Dot ────────────────────────────────────────────────────────────────
const HealthDot = ({ label, ok }) => (
    <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-[#00ff41]' : 'bg-[#f85149]'}`}
            style={{ boxShadow: ok ? '0 0 6px #00ff41' : '0 0 6px #f85149' }} />
        <span className="font-mono text-[11px] text-[#8b949e]">{label}</span>
        <span className="font-mono text-[10px]" style={{ color: ok ? '#00ff41' : '#f85149' }}>
            {ok ? 'ONLINE' : 'OFFLINE'}
        </span>
    </div>
);

// ── Compromised Modal ─────────────────────────────────────────────────────────
const CompromisedModal = ({ data, onDismiss }) => {
    if (!data) return null;
    const device = data.device || {};
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(248,81,73,0.12)', backdropFilter: 'blur(4px)' }}
        >
            {/* Scan line effect */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(248,81,73,0.03) 2px, rgba(248,81,73,0.03) 4px)',
                }}
            />
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="relative w-[480px] border-2 border-[#f85149] bg-[#09090b] shadow-[0_0_60px_rgba(248,81,73,0.3)]"
            >
                {/* Pulsing top bar */}
                <motion.div
                    className="h-1 bg-[#f85149] w-full"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                />

                <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: [0, -5, 5, -5, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                            >
                                <ShieldAlert size={28} className="text-[#f85149]" style={{ filter: 'drop-shadow(0 0 8px #f85149)' }} />
                            </motion.div>
                            <div>
                                <div className="font-mono text-[11px] uppercase tracking-widest text-[#f85149] mb-0.5">
                                    ⚠ CRITICAL SECURITY ALERT
                                </div>
                                <div className="font-mono text-[18px] font-black text-white tracking-wider">
                                    DEVICE COMPROMISED
                                </div>
                            </div>
                        </div>
                        <button onClick={onDismiss} className="text-[#52525b] hover:text-[#e6edf3] transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="border border-[#f85149]/30 bg-[#f85149]/5 p-4 mb-4 space-y-2">
                        {[
                            ['Device', device.name || data.deviceId || 'Unknown'],
                            ['Type', device.type || 'N/A'],
                            ['IP', device.ipAddress || device.ip || 'N/A'],
                            ['Location', device.location || 'N/A'],
                            ['Threat', data.threatType || 'System Compromised'],
                            ['Status', 'AUTO-BLOCKED'],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[12px] font-mono">
                                <span className="text-[#52525b]">{k}</span>
                                <span className={k === 'Status' ? 'text-[#f85149] font-bold' : 'text-[#e6edf3]'}>{v}</span>
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] font-mono text-[#52525b] mb-5">
                        {data.details || 'Device has been automatically blocked. Investigate immediately and resolve the incident.'}
                    </p>

                    <button
                        onClick={onDismiss}
                        className="w-full h-10 bg-[#f85149] hover:bg-[#e03428] text-white font-mono text-[12px] uppercase tracking-widest font-bold transition-colors"
                    >
                        ACKNOWLEDGE &amp; DISMISS
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const LiveMonitor = () => {
    const { liveFeedEntries, isConnected, compromisedDevice, liveMetrics } = useLiveFeed();
    const [health, setHealth] = useState({ status: 'checking', database: 'checking' });
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState(null);
    const feedRef = useRef(null);

    // Poll health
    useEffect(() => {
        const check = async () => {
            const res = await getHealth();
            setHealth(res.data);
        };
        check();
        const id = setInterval(check, 15000);
        return () => clearInterval(id);
    }, []);

    // Show modal when device is compromised
    useEffect(() => {
        if (compromisedDevice) {
            setModalData(compromisedDevice);
            setShowModal(true);
        }
    }, [compromisedDevice]);

    // Rolling metrics series
    const cpuSeries = useRollingData(liveMetrics.cpu);
    const ramSeries = useRollingData(liveMetrics.ram);
    const pktSeries = useRollingData(Math.min(100, (liveMetrics.packets / 50)));

    // Format packet frequency for charts
    const cpuChartData = cpuSeries.map(p => ({ ...p, v0: p.v }));
    const ramChartData = ramSeries.map(p => ({ ...p, v0: p.v }));
    const netChartData = pktSeries.map(p => ({ ...p, v0: p.v }));

    // Severity counts from feed
    const feedStats = useMemo(() => {
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        liveFeedEntries.slice(0, 100).forEach(e => {
            if (counts[e.severity] !== undefined) counts[e.severity]++;
        });
        return counts;
    }, [liveFeedEntries]);

    const serverOk = health.status === 'ok' || health.status === 'online';
    const dbOk = health.database === 'connected' || health.database === 'online';

    return (
        <div className="h-full flex flex-col max-w-[1600px] mx-auto">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <Reveal>
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-1 h-8 bg-[#00ff41]" style={{ boxShadow: '0 0 10px #00ff41' }} />
                        <div>
                            <h1 className="font-mono text-[18px] font-black uppercase tracking-widest text-white">
                                <span className="text-[#00ff41] opacity-60">/sys/</span>live-monitor
                            </h1>
                            <p className="font-mono text-[10px] text-[#52525b] tracking-wider mt-0.5">
                                REAL-TIME TELEMETRY &amp; THREAT INTELLIGENCE
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <HealthDot label="Server" ok={serverOk} />
                        <HealthDot label="Database" ok={dbOk} />
                        <div className="flex items-center gap-2 border border-[#27272a] px-3 py-1.5">
                            <motion.span
                                className="w-2 h-2 rounded-full bg-[#00ff41]"
                                animate={{ opacity: isConnected ? [1, 0.3, 1] : 0.2 }}
                                transition={{ duration: 1.4, repeat: Infinity }}
                                style={{ boxShadow: isConnected ? '0 0 6px #00ff41' : 'none' }}
                            />
                            <span className="font-mono text-[10px] tracking-widest" style={{ color: isConnected ? '#00ff41' : '#52525b' }}>
                                {isConnected ? 'LIVE' : 'CONNECTING'}
                            </span>
                        </div>
                    </div>
                </div>
            </Reveal>

            {/* ── Stats Row ─────────────────────────────────────────────────── */}
            <Reveal delay={0.05}>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
                    <StatPill label="CPU Usage" value={liveMetrics.cpu.toFixed(0)} unit="%" color="#00ff41" />
                    <StatPill label="RAM Usage" value={liveMetrics.ram.toFixed(0)} unit="%" color="#388bfd" />
                    <StatPill label="Packets/s" value={liveMetrics.packets} unit="pkt" color="#d29922" />
                    <StatPill label="Critical" value={feedStats.critical} color="#f85149" />
                    <StatPill label="High" value={feedStats.high} color="#e3782c" />
                    <StatPill label="Events" value={liveFeedEntries.length} color="#52525b" />
                </div>
            </Reveal>

            {/* ── Charts + Feed ─────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

                {/* Charts Column */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <Reveal delay={0.1}>
                        <LiveChartCard
                            title="CPU Usage"
                            icon={Cpu}
                            data={cpuChartData}
                            dataKeys={['CPU']}
                            colors={['#00ff41']}
                            unit="%"
                        />
                    </Reveal>
                    <Reveal delay={0.15}>
                        <LiveChartCard
                            title="RAM Usage"
                            icon={MemoryStick}
                            data={ramChartData}
                            dataKeys={['RAM']}
                            colors={['#388bfd']}
                            unit="%"
                        />
                    </Reveal>
                    <Reveal delay={0.2}>
                        <LiveChartCard
                            title="Network Activity"
                            icon={Wifi}
                            data={netChartData}
                            dataKeys={['Packets']}
                            colors={['#d29922']}
                            unit=" pkt"
                        />
                    </Reveal>
                </div>

                {/* Live Alert Feed */}
                <Reveal delay={0.1}>
                    <div className="w-full lg:w-[340px] shrink-0 border border-[#27272a] bg-[#0d1117] flex flex-col min-h-[400px] lg:min-h-0 lg:h-auto">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] shrink-0">
                            <div className="flex items-center gap-2">
                                <Zap size={13} className="text-[#00ff41]" />
                                <span className="font-mono text-[11px] uppercase tracking-widest text-[#e6edf3]">Live Alert Feed</span>
                            </div>
                            <span className="font-mono text-[10px] text-[#52525b] border border-[#27272a] px-2 py-0.5">
                                {liveFeedEntries.length} events
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto" ref={feedRef}>
                            {liveFeedEntries.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-[11px] font-mono text-[#52525b]">
                                    WAITING FOR TELEMETRY...
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <AnimatePresence initial={false}>
                                        {liveFeedEntries.slice(0, 80).map((entry) => {
                                            const color = SEVERITY_COLORS[entry.severity] || '#52525b';
                                            return (
                                                <motion.div
                                                    key={entry.id}
                                                    initial={{ opacity: 0, x: 20, height: 0 }}
                                                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                    className="px-3 py-2.5 border-b border-[#1c2128] hover:bg-[#161b22] transition-colors group"
                                                    style={{ borderLeft: `3px solid ${color}` }}
                                                >
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className="font-mono text-[11px] font-bold text-[#e6edf3] truncate max-w-[160px]">
                                                            {entry.deviceName}
                                                        </span>
                                                        <span className="font-mono text-[9px] text-[#52525b] ml-2 whitespace-nowrap group-hover:text-[#8b949e] transition-colors">
                                                            {safeFormat(entry.timestamp, 'HH:mm:ss')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-mono text-[10px] text-[#8b949e] truncate max-w-[170px]">
                                                            {entry.eventType}
                                                        </span>
                                                        <span className="font-mono text-[9px] font-bold uppercase ml-1" style={{ color }}>
                                                            {entry.severity}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </Reveal>
            </div>

            {/* ── Device Compromised Modal ──────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <CompromisedModal data={modalData} onDismiss={() => setShowModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveMonitor;
