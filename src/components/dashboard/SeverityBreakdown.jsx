import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '../ui/Card';
import { getIncidents } from '../../services/api';
import { SEVERITY, SEVERITY_COLORS } from '../../constants/severity';

const SeverityBreakdown = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        getIncidents().then(res => {
            const counts = { critical: 0, high: 0, medium: 0, low: 0 };
            res.data.forEach(inc => {
                if (counts[inc.severity] !== undefined) counts[inc.severity]++;
            });

            setData([
                { name: 'Critical', value: counts.critical, color: SEVERITY_COLORS[SEVERITY.CRITICAL] },
                { name: 'High', value: counts.high, color: SEVERITY_COLORS[SEVERITY.HIGH] },
                { name: 'Medium', value: counts.medium, color: SEVERITY_COLORS[SEVERITY.MEDIUM] },
                { name: 'Low', value: counts.low, color: SEVERITY_COLORS[SEVERITY.LOW] },
            ].filter(d => d.value > 0));
        });
    }, []);

    return (
        <Card className="h-[180px] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] shrink-0">
                <h3 className="font-medium text-[var(--text-primary)] text-13px">Severity Breakdown</h3>
            </div>
            <div className="flex-1 flex items-center p-2">
                <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={40}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-default)', fontSize: '11px', borderRadius: '6px' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center gap-1.5 pl-2">
                    {data.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-11px">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-[var(--text-secondary)]">{item.name}</span>
                            </div>
                            <span className="text-[var(--text-primary)] font-medium font-mono">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default SeverityBreakdown;
