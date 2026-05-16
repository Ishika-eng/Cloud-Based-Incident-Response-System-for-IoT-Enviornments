import React from 'react';

// For device status
export const StatusDot = ({ color, className = '' }) => (
    <span
        className={`inline-block w-2 h-2 rounded-full ${className}`}
        style={{ backgroundColor: color }}
    />
);

// For severity etc - colored text label
export const TextBadge = ({ text, color, className = '' }) => (
    <span
        className={`text-[11px] uppercase tracking-wider font-semibold ${className}`}
        style={{ color }}
    >
        {text}
    </span>
);

// Standard simple badge (if needed for counts, but avoid large pills per spec)
export const CountBadge = ({ count, className = '' }) => (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-[10px] bg-[#21262d] border border-[#30363d] text-[12px] font-medium text-[#8b949e] ${className}`}>
        {count}
    </span>
);
