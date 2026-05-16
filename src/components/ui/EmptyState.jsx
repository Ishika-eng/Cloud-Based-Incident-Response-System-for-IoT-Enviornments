import React from 'react';
import { AlertCircle } from 'lucide-react';

const EmptyState = ({ icon: Icon = AlertCircle, title, description, action }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-[var(--border-default)] rounded-[6px] bg-[var(--bg-surface)]">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
            <Icon className="text-[var(--text-muted)]" size={20} />
        </div>
        <h3 className="text-13px font-medium text-[var(--text-primary)] mb-1">{title}</h3>
        <p className="text-11px text-[var(--text-secondary)] max-w-sm mb-4">{description}</p>
        {action && <div>{action}</div>}
    </div>
);

export default EmptyState;
