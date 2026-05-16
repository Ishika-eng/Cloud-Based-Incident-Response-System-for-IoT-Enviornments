import React from 'react';
import { Search } from 'lucide-react';

const IncidentFilterBar = ({ filters, setFilters, uniqueTypes, uniqueStatuses, uniqueSeverities }) => {
    const handleChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value ? [value] : []
        }));
    };

    return (
        <div className="p-3 border-b border-[var(--border-default)] flex gap-3 bg-[#161b22] shrink-0">
            <div className="relative w-64 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                <input
                    type="text"
                    placeholder="Search incidents..."
                    className="w-full !h-[32px] pl-8 pr-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd] transition-colors"
                />
            </div>

            <select
                value={filters.severity?.[0] || ''}
                onChange={e => handleChange('severity', e.target.value)}
                className="!h-[32px] px-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd]"
            >
                <option value="">All Severities</option>
                {uniqueSeverities.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
                value={filters.type?.[0] || ''}
                onChange={e => handleChange('type', e.target.value)}
                className="!h-[32px] px-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd]"
            >
                <option value="">All Types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
                value={filters.status?.[0] || ''}
                onChange={e => handleChange('status', e.target.value)}
                className="!h-[32px] px-3 !bg-[#1c2128] !border !border-[#30363d] !rounded-[6px] !text-[#e6edf3] !text-[13px] focus:!outline-none focus:!border-[#388bfd] focus:!ring-1 focus:!ring-[#388bfd]"
            >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
    );
};

export default IncidentFilterBar;
