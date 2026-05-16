import React, { useState, useEffect } from 'react';
import { getIncidents, acknowledgeIncident } from '../services/api';
import Card from '../components/ui/Card';
import IncidentTable from '../components/incidents/IncidentTable';
import IncidentDrawer from '../components/incidents/IncidentDrawer';
import IncidentFilterBar from '../components/incidents/IncidentFilterBar';
import { CountBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Download } from 'lucide-react';
import { toast } from '../components/ui/Toast';
import ExportMenu from '../components/analytics/ExportMenu';
import { useLiveFeed } from '../hooks/useLiveFeed';

const Incidents = () => {
    const [incidents, setIncidents] = useState([]);
    const [filteredIncidents, setFilteredIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filters, setFilters] = useState({ severity: [], type: [], status: [] });
    const { liveFeedEntries, resolvedIncident } = useLiveFeed();
    const [newIds, setNewIds] = useState(new Set());

    const loadIncidents = async () => {
        try {
            const res = await getIncidents();
            setIncidents(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadIncidents();
    }, []);

    useEffect(() => {
        if (!liveFeedEntries[0]?.alertId) return;
        const id = liveFeedEntries[0].alertId;
        setNewIds(prev => new Set([...prev, id]));
        setTimeout(() => {
            setNewIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        }, 4000);
    }, [liveFeedEntries]);

    useEffect(() => {
        if (!resolvedIncident) return;
        setIncidents(prev =>
            prev.map(i =>
                (i.id === resolvedIncident.incidentId || i.incidentId === resolvedIncident.incidentId)
                    ? { ...i, status: 'resolved' }
                    : i
            )
        );
        if (selectedIncident?.id === resolvedIncident.incidentId || selectedIncident?.incidentId === resolvedIncident.incidentId) {
            setSelectedIncident(prev => ({ ...prev, status: 'resolved' }));
        }
    }, [resolvedIncident]);

    useEffect(() => {
        let result = [...incidents];
        if (filters.severity?.length > 0) result = result.filter(i => filters.severity.includes(i.severity));
        if (filters.type?.length > 0) result = result.filter(i => filters.type.includes(i.type));
        if (filters.status?.length > 0) result = result.filter(i => filters.status.includes(i.status));
        setFilteredIncidents(result);
    }, [incidents, filters]);

    const uniqueTypes = [...new Set(incidents.map(i => i.type))];
    const uniqueStatuses = [...new Set(incidents.map(i => i.status))];
    const uniqueSeverities = [...new Set(incidents.map(i => i.severity))];

    const handleBulkAck = async () => {
        try {
            await Promise.all(selectedIds.map(id => acknowledgeIncident(id)));
            toast.success(`${selectedIds.length} incidents acknowledged`);
            setSelectedIds([]);
            loadIncidents();
        } catch (e) {
            toast.error('Failed to act on selected incidents');
        }
    };

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-wide">Incidents</h1>
                    <CountBadge count={incidents.filter(i => i.status === 'open').length} />
                </div>
                <ExportMenu />
            </div>

            <Card className="flex-1 flex flex-col min-h-0">
                <IncidentFilterBar
                    filters={filters}
                    setFilters={setFilters}
                    uniqueTypes={uniqueTypes}
                    uniqueStatuses={uniqueStatuses}
                    uniqueSeverities={uniqueSeverities}
                />

                {selectedIds.length > 0 && (
                    <div className="bg-[var(--bg-hover)] p-2 px-4 border-b border-[var(--border-default)] flex gap-3 items-center shrink-0">
                        <span className="text-11px text-[var(--text-primary)]">{selectedIds.length} selected</span>
                        <Button variant="secondary" size="small" onClick={handleBulkAck}>Acknowledge Selected</Button>
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                    <IncidentTable
                        incidents={filteredIncidents}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onView={(i) => setSelectedIncident(i)}
                        newIds={newIds}
                    />
                </div>
            </Card>

            <IncidentDrawer
                incident={selectedIncident}
                isOpen={!!selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onRefresh={loadIncidents}
            />
        </div>
    );
};

export default Incidents;
