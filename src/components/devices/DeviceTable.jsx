import React from 'react';
import DataTable from '../ui/DataTable';
import DeviceStatusDot from './DeviceStatusDot';
import Button from '../ui/Button';
import { safeFormat } from '../../utils/dateFormat';

const DeviceTable = ({ devices, onView }) => {
    const columns = [
        {
            header: '',
            accessor: 'status',
            render: (row) => <div className="pl-1"><DeviceStatusDot status={row.status} /></div>
        },
        {
            header: 'Name',
            accessor: 'name',
            render: (row) => <span className="font-medium text-13px cursor-pointer hover:text-[var(--text-link)]" onClick={() => onView(row)}>{row.name}</span>
        },
        { header: 'Type', accessor: 'type' },
        {
            header: 'IP Address',
            accessor: 'ip',
            render: (row) => <span className="font-mono text-11px">{row.ip}</span>
        },
        { header: 'Location', accessor: 'location' },
        {
            header: 'Last Seen',
            accessor: 'lastSeen',
            render: (row) => <span className="font-mono text-11px max-w-[120px] truncate block">{safeFormat(row.lastSeen, 'MMM dd, HH:mm')}</span>
        },
        {
            header: 'Incidents',
            accessor: 'totalIncidents',
            render: (row) => <span className={`font-mono font-medium text-11px ${row.totalIncidents > 0 ? 'text-[var(--text-danger)]' : 'text-[var(--text-muted)]'}`}>{row.totalIncidents}</span>
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

    return <DataTable columns={columns} data={devices} className="h-full" />;
};

export default DeviceTable;
