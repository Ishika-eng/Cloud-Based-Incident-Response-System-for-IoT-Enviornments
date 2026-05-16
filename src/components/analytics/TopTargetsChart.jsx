import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { getTopTargets } from '../../services/api';

const TopTargetsChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        getTopTargets().then(res => {
            setData(res.data);
        });
    }, []);

    return (
        <Card className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] shrink-0">
                <h3 className="font-medium text-[var(--text-primary)] text-[13px]">Top Targeted Devices</h3>
            </div>
            <div className="flex-1 p-4 min-h-[200px] ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="var(--text-primary)"
                            fontSize={11}
                            fontFamily="JetBrains Mono, monospace"
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--bg-hover)' }}
                            contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-default)', fontSize: '11px', borderRadius: '6px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                            {data.map((entry, index) => {
                                const opacities = [1, 0.8, 0.65, 0.5, 0.4];
                                return <Cell key={`cell-${index}`} fill="var(--chart-1)" fillOpacity={opacities[index] || 0.4} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TopTargetsChart;
