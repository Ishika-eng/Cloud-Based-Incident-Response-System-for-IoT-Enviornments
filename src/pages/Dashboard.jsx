import React from 'react';
import { motion } from 'framer-motion';
import MetricStrip from '../components/dashboard/MetricStrip';
import LiveFeed from '../components/dashboard/LiveFeed';
import PacketsChart from '../components/dashboard/PacketsChart';
import RecentIncidents from '../components/dashboard/RecentIncidents';
import SeverityBreakdown from '../components/dashboard/SeverityBreakdown';
import DeviceStatusGrid from '../components/dashboard/DeviceStatusGrid';
import LiveSensorPanel from '../components/dashboard/LiveSensorPanel';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const Dashboard = () => {
    return (
        <div className="h-full flex flex-col">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
                <MetricStrip />
            </motion.div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 mt-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full lg:w-[280px] shrink-0 h-[400px] lg:h-auto"
                >
                    <LiveFeed />
                </motion.div>

                <div className="flex-1 flex flex-col min-w-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="h-[300px] lg:h-[60%] shrink-0"
                    >
                        <PacketsChart />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 mt-4 lg:min-h-0"
                    >
                        <RecentIncidents />
                    </motion.div>
                </div>

                <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <SeverityBreakdown />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.45, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <DeviceStatusGrid />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.45, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 flex flex-col min-h-0"
                        style={{ minHeight: '220px' }}
                    >
                        <LiveSensorPanel />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
