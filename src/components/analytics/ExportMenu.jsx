import React, { useState } from 'react';
import Button from '../ui/Button';
import { Download } from 'lucide-react';
import { toast } from '../ui/Toast';
import { getIncidents } from '../../services/api';
import { format } from 'date-fns';

const ExportMenu = () => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (formatType) => {
        if (formatType !== 'csv') return;
        setIsExporting(true);
        toast.success(`Starting CSV export...`);

        try {
            const res = await getIncidents();
            const data = res.data;

            if (!data || data.length === 0) {
                toast.error('No data to export');
                return;
            }

            // Define CSV headers
            const headers = ['ID', 'Title', 'Severity', 'Status', 'Timestamp'];

            // Map data to rows
            const rows = data.map(inc => [
                inc.id,
                `"${inc.title}"`,
                inc.severity,
                inc.status,
                format(new Date(inc.timestamp), 'yyyy-MM-dd HH:mm:ss')
            ]);

            // Generate CSV string
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            // Trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `threatnest_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Export completed successfully');
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Failed to generate export file');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button variant="secondary" className="gap-2" onClick={() => handleExport('csv')} disabled={isExporting}>
            <Download size={14} /> {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
    );
};

export default ExportMenu;
