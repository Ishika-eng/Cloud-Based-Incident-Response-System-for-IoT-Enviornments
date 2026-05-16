import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Card from '../ui/Card';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { getDevices, getIncidents, getHealth } from '../../services/api';

// ── 3D Tilt Card ──────────────────────────────────────────────────────────────
const TiltCard = ({ children, className, style }) => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e) => {
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };
    const handleMouseLeave = () => { x.set(0); y.set(0); };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: 600, ...style }}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                className={className}
            >
                {children}
            </motion.div>
        </motion.div>
    );
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
const generateSparklineData = (base, variance) =>
    Array.from({ length: 15 }).map(() => ({
        value: Math.max(0, base + (Math.random() * variance * 2 - variance))
    }));

// ── Metric Card ───────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, delta, deltaType, strokeColor, fillColor, data, delay = 0 }) => {
    const isPositive = deltaType === 'positive';
    const isNegative = deltaType === 'negative';
    const isThreatMetric = label.includes('Threats') || label.includes('Incidents');

    let DeltaIcon = Minus;
    let deltaColor = 'text-[#52525b]';
    if (isPositive) {
        DeltaIcon = ArrowUpRight;
        deltaColor = isThreatMetric ? 'text-[#f85149]' : 'text-[#3fb950]';
    } else if (isNegative) {
        DeltaIcon = ArrowDownRight;
        deltaColor = isThreatMetric ? 'text-[#3fb950]' : 'text-[#f85149]';
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            <TiltCard>
                <Card
                    className="flex flex-col overflow-hidden"
                    style={{ backgroundColor: '#161b22', border: '1px solid #21262d' }}
                >
                    <div className="p-4 pb-2 flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] uppercase tracking-widest font-medium text-[#52525b] font-mono">
                                {label}
                            </div>
                            <div className={`flex items-center text-[11px] font-medium ${deltaColor}`}>
                                <DeltaIcon size={14} className="mr-0.5" />
                                {delta}
                            </div>
                        </div>
                        <div className="text-[28px] font-black text-[#e6edf3] leading-none font-mono">
                            {value}
                        </div>
                    </div>
                    <div className="h-[50px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={strokeColor}
                                    fill={fillColor}
                                    strokeWidth={1.5}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </TiltCard>
        </motion.div>
    );
};

// ── Strip ─────────────────────────────────────────────────────────────────────
const MetricStrip = () => {
    const [metrics, setMetrics] = useState({
        total: 0, active: 0, blocked: 0, incidents: 0, critical: 0, healthy: 0
    });

    useEffect(() => {
        Promise.all([
            getDevices().catch(() => ({ data: [] })),
            getIncidents().catch(() => ({ data: [] })),
        ]).then(([devRes, incRes]) => {
            const devices = devRes.data || [];
            const incidents = incRes.data || [];
            const active = devices.filter(d => d.status === 'Active').length;
            const blocked = devices.filter(d => d.status === 'Blocked').length;
            const openInc = incidents.filter(i => i.status !== 'resolved').length;
            const critical = incidents.filter(i => i.severity === 'critical').length;
            const healthy = devices.length > 0 ? Math.round((active / devices.length) * 100) : 0;
            setMetrics({ total: devices.length, active, blocked, incidents: openInc, critical, healthy });
        });
    }, []);

    const cards = [
        {
            label: 'Total Devices',
            value: metrics.total,
            delta: `${metrics.active} active`,
            deltaType: 'neutral',
            strokeColor: '#388bfd',
            fillColor: '#388bfd20',
            data: generateSparklineData(metrics.total, 2),
        },
        {
            label: 'Blocked Devices',
            value: metrics.blocked,
            delta: metrics.blocked > 0 ? 'Under lockdown' : 'All clear',
            deltaType: metrics.blocked > 0 ? 'positive' : 'neutral',
            strokeColor: '#f85149',
            fillColor: '#f8514920',
            data: generateSparklineData(metrics.blocked, 1),
        },
        {
            label: 'Open Incidents',
            value: metrics.incidents,
            delta: `${metrics.critical} critical`,
            deltaType: metrics.critical > 0 ? 'positive' : 'neutral',
            strokeColor: '#d29922',
            fillColor: '#d2992220',
            data: generateSparklineData(metrics.incidents, 3),
        },
        {
            label: 'Systems Healthy',
            value: `${metrics.healthy}%`,
            delta: metrics.healthy >= 80 ? 'Nominal' : 'Degraded',
            deltaType: metrics.healthy >= 80 ? 'negative' : 'positive',
            strokeColor: '#3fb950',
            fillColor: '#3fb95020',
            data: generateSparklineData(metrics.healthy, 5),
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, i) => (
                <MetricCard key={card.label} {...card} delay={i * 0.08} />
            ))}
        </div>
    );
};

export default MetricStrip;
