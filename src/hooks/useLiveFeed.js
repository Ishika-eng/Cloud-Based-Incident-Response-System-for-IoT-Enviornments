import { useWebSocket } from './useWebSocket';

export const useLiveFeed = () => {
    const { liveFeedEntries, isConnected, compromisedDevice, deviceStatusUpdates, resolvedIncident, liveMetrics, sensorReadings } = useWebSocket();
    return { liveFeedEntries, isConnected, compromisedDevice, deviceStatusUpdates, resolvedIncident, liveMetrics, sensorReadings };
};
