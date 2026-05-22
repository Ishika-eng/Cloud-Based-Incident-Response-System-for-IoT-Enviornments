import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIncidents } from '../../services/api';
import Card from '../ui/Card';
import DataTable from '../ui/DataTable';
import { TextBadge } from '../ui/Badge';
import { SEVERITY_COLORS } from '../../constants/severity';
import { safeFormat } from '../../utils/dateFormat';
import { ROUTES } from '../../constants/routes';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { motion, AnimatePresence } from 'framer-motion';

const RecentIncidents = () => {
    const [incidents, setIncidents] = useState([]);
    const { liveFeedEntries } = useLiveFeed();
    const [newIncidentId, setNewIncidentId] = useState(null);

    useEffect(() => {
        getIncidents().then(res => {
            setIncidents(res.data.slice(0, 5));
        });
    }, []);

    useEffect(() => {
        if (liveFeedEntries.length === 0) return;
        const latest = liveFeedEntries[0];
        if (latest.severity === 'critical' || latest.severity === 'high') {
            setNewIncidentId(latest.alertId || latest.id);
            setTimeout(() => setNewIncidentId(null), 3000);
            
            // Add to the list if it's not already there
            setIncidents(prev => {
                const isExisting = prev.some(i => i.id === (latest.alertId || latest.id));
                if (isExisting) return prev;
                return [{
                    id: latest.alertId || latest.id,
                    incidentId: latest.alertId || latest.id,
                    severity: latest.severity,
                    type: latest.eventType,
                    deviceName: latest.deviceName,
                    timestamp: latest.timestamp,
                    status: 'open'
                }, ...prev].slice(0, 5);
            });
        }
    }, [liveFeedEntries]);

    const columns = [
        {
            header: 'Severity',
            accessor: 'severity',
            render: (row) => <TextBadge text={row.severity} color={SEVERITY_COLORS[row.severity]} />
        },
        { header: 'Type', accessor: 'type' },
        {
            header: 'Device',
            accessor: 'deviceName',
            render: (row) => <span className="font-mono text-11px">{row.deviceName}</span>
        },
        {
            header: 'Time',
            accessor: 'timestamp',
            render: (row) => <span className="font-mono text-11px text-[var(--text-muted)]">{safeFormat(row.timestamp, 'MMM dd, HH:mm')}</span>
        }
    ];

    return (
        <Card className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                <h3 className="font-medium text-[var(--text-primary)] text-13px">Recent Incidents</h3>
                <Link to={ROUTES.INCIDENTS} className="text-11px text-[var(--text-link)] hover:underline font-medium">
                    View All →
                </Link>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <DataTable 
                    columns={columns} 
                    data={incidents} 
                    rowClassName={(row) => row.id === newIncidentId || row.incidentId === newIncidentId ? 'bg-[rgba(239,68,68,0.1)] border-l-[3px] border-[var(--color-critical)] transition-all duration-300' : 'transition-all duration-300'}
                />
            </div>
        </Card>
    );
};

export default RecentIncidents;
