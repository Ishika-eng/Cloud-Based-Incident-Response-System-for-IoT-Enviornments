import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { getAttackHeatmap, getAnalytics } from '../../services/api';
import Tooltip from '../ui/Tooltip';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 24 }).map((_, i) => i);

const ColorScale = ({ val }) => {
    if (val === 0) return 'bg-[#1c2128]';
    if (val <= 2) return 'bg-[#1e3a5f]';
    if (val <= 5) return 'bg-[#1d4ed8] opacity-60';
    if (val <= 9) return 'bg-[#d29922]';
    return 'bg-[#f85149]';
};

const AttackHeatmap = () => {
    const [matrix, setMatrix] = useState([]);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        getAttackHeatmap().then(res => {
            const grid = Array(7).fill(0).map(() => Array(24).fill(0));
            res.data.forEach(item => {
                if (item.day < 7 && item.hour < 24) {
                    grid[item.day][item.hour] = item.count;
                }
            });
            setMatrix(grid);
        });

        getAnalytics().then(res => {
            setStats(res.data);
        });
    }, []);

    return (
        <Card className="flex flex-col h-full w-full overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] shrink-0 flex justify-between items-center bg-[var(--bg-surface)]">
                <h3 className="font-medium text-[var(--text-primary)] text-[13px]">Attack Intensity Heatmap</h3>
                <div className="flex gap-2 text-[10px] items-center text-[var(--text-secondary)]">
                    <span>Low</span>
                    <div className="flex gap-0.5">
                        <span className="w-3 h-3 rounded-[2px] bg-[#1c2128]"></span>
                        <span className="w-3 h-3 rounded-[2px] bg-[#1e3a5f]"></span>
                        <span className="w-3 h-3 rounded-[2px] bg-[#1d4ed8] opacity-60"></span>
                        <span className="w-3 h-3 rounded-[2px] bg-[#d29922]"></span>
                        <span className="w-3 h-3 rounded-[2px] bg-[#f85149]"></span>
                    </div>
                    <span>High</span>
                </div>
            </div>

            <div className="p-6 overflow-x-auto flex-1">
                <div className="min-w-[700px]">
                    <div className="flex mb-2 ml-10">
                        {hours.map(h => (
                            <div key={h} className="flex-1 text-center text-[10px] text-[var(--text-muted)] font-mono">
                                {h % 2 === 0 ? h : ''}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-[2px]">
                        {matrix.map((row, dayIdx) => (
                            <div key={dayIdx} className="flex items-center">
                                <div className="w-10 text-[11px] text-[var(--text-secondary)] font-medium text-right pr-3 shrink-0">
                                    {days[dayIdx]}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 24px)', gap: '2px' }}>
                                    {row.map((count, hourIdx) => (
                                        <Tooltip key={hourIdx} text={`${days[dayIdx]} ${hourIdx}:00 — ${count} attacks`}>
                                            <div className={`transition-transform hover:scale-110 cursor-crosshair shrink-0 ${ColorScale({ val: count })}`} style={{ width: '24px', height: '18px', borderRadius: '2px' }} />
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {stats && (
                <div className="border-t border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    <div className="border-r border-[var(--border-default)] pr-4">
                        <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider mb-1">Most Active Hour</div>
                        <div className="text-[14px] font-mono text-[var(--text-primary)]">{stats.mostActiveHour}</div>
                    </div>
                    <div className="lg:border-r border-[var(--border-default)] px-4">
                        <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider mb-1">Most Targeted</div>
                        <div className="text-[14px] font-mono text-[var(--text-primary)] truncate">{stats.mostTargetedDevice}</div>
                    </div>
                    <div className="border-r border-[var(--border-default)] px-4">
                        <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider mb-1">Peak Attack Day</div>
                        <div className="text-[14px] text-[var(--text-primary)] font-medium">{stats.peakAttackDay}</div>
                    </div>
                    <div className="pl-4">
                        <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider mb-1">Total Attacks</div>
                        <div className="text-[14px] font-mono text-[var(--text-danger)] font-medium">{stats.totalAttacks.toLocaleString()}</div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default AttackHeatmap;
