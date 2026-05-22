import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { safeFormat } from '../../utils/dateFormat';
import { StatusDot } from '../ui/Badge';
import { SEVERITY_COLORS } from '../../constants/severity';
import Card from '../ui/Card';

const LiveFeed = () => {
    const { liveFeedEntries, isConnected } = useLiveFeed();
    const listRef = useRef(null);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
                <h3 className="font-medium text-[var(--text-primary)] text-13px">Live Event Feed</h3>
                <span className="flex h-2 w-2 relative">
                    {isConnected && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--safe)] opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-[var(--safe)]' : 'bg-[var(--offline)]'}`}></span>
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2" ref={listRef}>
                {liveFeedEntries.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-11px text-[var(--text-muted)]">
                        Waiting for telemetry...
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 overflow-hidden p-1">
                        <AnimatePresence initial={false}>
                            {liveFeedEntries.map((entry) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 6 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className="flex items-start gap-2 py-1 transition-colors group cursor-default"
                                    style={{ borderLeft: `3px solid ${SEVERITY_COLORS[entry.severity]}`, paddingLeft: '10px', backgroundColor: 'transparent' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1c2128'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5 gap-2">
                                            <span className="text-[var(--text-primary)] font-medium text-11px truncate hover-glitch cursor-crosshair">{entry.deviceName}</span>
                                            <span className="font-mono text-[var(--text-muted)] text-[10px] whitespace-nowrap group-hover:text-[var(--text-secondary)] transition-colors shrink-0">
                                                {safeFormat(entry.timestamp, 'HH:mm:ss')}
                                            </span>
                                        </div>
                                        <div className="text-[var(--text-secondary)] text-11px truncate">
                                            {entry.eventType}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default LiveFeed;
