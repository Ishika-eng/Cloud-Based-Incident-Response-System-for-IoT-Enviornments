import React from 'react';
import DataTable from '../ui/DataTable';
import SeverityLabel from './SeverityLabel';
import Button from '../ui/Button';
import { format } from 'date-fns';

const IncidentTable = ({ incidents, selectedIds, onSelectionChange, onView }) => {
    const toggleAll = (e) => {
        if (e.target.checked) onSelectionChange(incidents.map(i => i.id));
        else onSelectionChange([]);
    };

    const toggleRow = (id) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(x => x !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    const columns = [
        {
            header: <input
                type="checkbox"
                onChange={toggleAll}
                checked={incidents.length > 0 && selectedIds.length === incidents.length}
                className="rounded-[2px] border-[var(--border-default)] bg-[var(--bg-surface)] cursor-pointer"
            />,
            accessor: 'checkbox',
            render: (row) => (
                <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleRow(row.id)}
                    className="rounded-[2px] border-[var(--border-default)] bg-[var(--bg-surface)] cursor-pointer"
                />
            )
        },
        {
            header: 'Severity',
            accessor: 'severity',
            render: (row) => <SeverityLabel severity={row.severity} />
        },
        { header: 'Type', accessor: 'type' },
        {
            header: 'Device',
            accessor: 'deviceName',
            render: (row) => <span className="font-mono text-11px">{row.deviceName}</span>
        },
        {
            header: 'Source IP',
            accessor: 'sourceIP',
            render: (row) => <span className="font-mono text-11px">{row.sourceIP}</span>
        },
        {
            header: 'Timestamp',
            accessor: 'timestamp',
            render: (row) => <span className="font-mono text-11px max-w-[120px] truncate block text-[var(--text-muted)]">{format(new Date(row.timestamp), 'MMM dd, HH:mm:ss')}</span>
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span className="text-11px uppercase tracking-wider text-[var(--text-secondary)]">{row.status}</span>
            )
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (row) => (
                <button className="bg-transparent border border-transparent text-[#388bfd] text-[12px] font-medium hover:border-[#388bfd] px-2 py-1 rounded-[4px] transition-colors focus:outline-none" onClick={() => onView(row)}>
                    View
                </button>
            )
        }
    ];

    return <DataTable columns={columns} data={incidents} className="h-full" />;
};

export default IncidentTable;
