import React from 'react';

const ranges = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' }
];

const TimeRangeSelector = ({ value, onChange, className = '' }) => {
    return (
        <div className={`inline-flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[6px] p-0.5 ${className}`}>
            {ranges.map(range => {
                const isActive = value === range.value;
                return (
                    <button
                        key={range.value}
                        onClick={() => onChange(range.value)}
                        className={`
              h-[26px] px-3 text-11px font-medium rounded-[4px] transition-colors
              ${isActive
                                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                            }
            `}
                    >
                        {range.label}
                    </button>
                );
            })}
        </div>
    );
};

export default TimeRangeSelector;
