import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';
import { getIncidents } from '../../services/api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// JS getDay() returns 0=Sunday; convert to Mon-based index (0=Mon … 6=Sun)
const toMondayIndex = (date) => (date.getDay() + 6) % 7;

const buildTrendData = (incidents) => {
    const totals = Array(7).fill(0);
    const criticals = Array(7).fill(0);

    incidents.forEach((inc) => {
        const idx = toMondayIndex(new Date(inc.timestamp));
        totals[idx]++;
        if ((inc.severity || '').toLowerCase() === 'critical') {
            criticals[idx]++;
        }
    });

    return DAY_LABELS.map((name, i) => ({
        name,
        total: totals[i],
        critical: criticals[i],
    }));
};

const FALLBACK_DATA = [
    { name: 'Mon', total: 0, critical: 0 },
    { name: 'Tue', total: 0, critical: 0 },
    { name: 'Wed', total: 0, critical: 0 },
    { name: 'Thu', total: 0, critical: 0 },
    { name: 'Fri', total: 0, critical: 0 },
    { name: 'Sat', total: 0, critical: 0 },
    { name: 'Sun', total: 0, critical: 0 },
];

const TrendChart = () => {
    const [data, setData] = useState(FALLBACK_DATA);

    useEffect(() => {
        getIncidents({})
            .then((res) => {
                const incidents = res.data || [];
                if (incidents.length) {
                    setData(buildTrendData(incidents));
                }
            })
            .catch(() => {/* keep fallback */});
    }, []);

    return (
        <Card className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                <h3 className="font-medium text-[var(--text-primary)] text-[13px]">Incident Trends</h3>
                <div className="flex items-center gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--chart-1)]"></span>
                        <span className="text-[var(--text-secondary)]">Total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--critical)]"></span>
                        <span className="text-[var(--text-secondary)]">Critical</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 p-4 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-default)', fontSize: '11px', borderRadius: '6px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: 'var(--chart-1)' }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="critical" stroke="var(--critical)" strokeWidth={2} dot={{ r: 3, fill: 'var(--critical)' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TrendChart;
