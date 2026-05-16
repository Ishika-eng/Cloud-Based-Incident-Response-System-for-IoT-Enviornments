import { useWebSocket } from './useWebSocket';

export const useLiveFeed = () => {
    const { liveFeedEntries, isConnected, compromisedDevice, deviceStatusUpdates, resolvedIncident, liveMetrics } = useWebSocket();
    return { liveFeedEntries, isConnected, compromisedDevice, deviceStatusUpdates, resolvedIncident, liveMetrics };
};
