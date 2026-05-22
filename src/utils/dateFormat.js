import { format, formatDistanceToNow } from 'date-fns';

/**
 * Safe wrapper around date-fns format.
 * Returns `fallback` instead of throwing when the date is invalid.
 */
export const safeFormat = (value, fmt, fallback = '--:--') => {
    try {
        const d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) return fallback;
        return format(d, fmt);
    } catch {
        return fallback;
    }
};

export const safeDistanceToNow = (value, opts = { addSuffix: true }) => {
    try {
        const d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) return '--';
        return formatDistanceToNow(d, opts);
    } catch {
        return '--';
    }
};
