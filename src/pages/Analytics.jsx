import React from 'react';
import TrendChart from '../components/analytics/TrendChart';
import TopTargetsChart from '../components/analytics/TopTargetsChart';
import AttackHeatmap from '../components/analytics/AttackHeatmap';
import ExportMenu from '../components/analytics/ExportMenu';
import TimeRangeSelector from '../components/ui/TimeRangeSelector';
import { useTimeRange } from '../hooks/useTimeRange';

const Analytics = () => {
    const [timeRange, setTimeRange] = useTimeRange('7d');

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto gap-4">
            <div className="flex items-center justify-between shrink-0 mb-2">
                <h1 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-wide">Threat Analytics</h1>
                <ExportMenu />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 h-[300px]">
                <TrendChart />
                <TopTargetsChart />
            </div>

            <div className="flex-1 min-h-[400px]">
                <AttackHeatmap />
            </div>
        </div>
    );
};

export default Analytics;
