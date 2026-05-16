import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';

const data = [
    { name: 'Mon', total: 400, critical: 24 },
    { name: 'Tue', total: 300, critical: 13 },
    { name: 'Wed', total: 550, critical: 48 },
    { name: 'Thu', total: 200, critical: 8 },
    { name: 'Fri', total: 278, critical: 39 },
    { name: 'Sat', total: 189, critical: 4 },
    { name: 'Sun', total: 239, critical: 12 },
];

const TrendChart = () => {
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
