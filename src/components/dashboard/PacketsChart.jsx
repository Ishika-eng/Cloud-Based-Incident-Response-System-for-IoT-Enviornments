import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { safeFormat } from '../../utils/dateFormat';
import Card from '../ui/Card';
import { useLiveFeed } from '../../hooks/useLiveFeed';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-default)] p-2 rounded-[6px] shadow-lg">
                <p className="font-mono text-11px text-[var(--text-muted)] mb-1">{label}</p>
                <p className="text-13px text-[var(--text-primary)] font-medium">
                    {payload[0].value} <span className="text-[var(--text-secondary)] font-normal text-11px">packets/s</span>
                </p>
            </div>
        );
    }
    return null;
};

const PacketsChart = () => {
    const { liveFeedEntries, liveMetrics } = useLiveFeed();

    const data = useMemo(() => {
        let chartData = [...liveFeedEntries].slice(0, 60).reverse().map(e => ({
            time: safeFormat(e.timestamp, 'HH:mm:ss', '--:--:--'),
            value: e.packetsPerSecond ?? liveMetrics.packets,
        }));

        if (chartData.length < 60) {
            const now = Date.now();
            const fillers = Array.from({ length: 60 - chartData.length }).map((_, i) => ({
                time: format(new Date(now - (60 - i) * 2000), 'HH:mm:ss'),
                value: Math.floor(Math.random() * 500) + 200
            }));
            chartData = [...fillers, ...chartData];
        }

        return chartData;
    }, [liveFeedEntries]);

    return (
        <Card className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                <h3 className="font-medium text-[var(--text-primary)] text-13px">Network Traffic (Packets/sec)</h3>
                <div className="flex items-center gap-3 text-11px">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--chart-1)]"></span>
                        <span className="text-[var(--text-secondary)]">Traffic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-0.5 bg-[var(--critical)]"></span>
                        <span className="text-[var(--text-secondary)]">Threshold</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-default)' }} />
                        <ReferenceLine y={4000} stroke="var(--critical)" strokeDasharray="3 3" />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorTraffic)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default PacketsChart;
