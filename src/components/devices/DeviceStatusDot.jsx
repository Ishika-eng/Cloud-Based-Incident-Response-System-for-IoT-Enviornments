import React from 'react';
import { StatusDot } from '../ui/Badge';
import { DEVICE_STATUS_COLORS } from '../../constants/deviceTypes';

const DeviceStatusDot = ({ status }) => {
    return <StatusDot color={DEVICE_STATUS_COLORS[status]} />;
};

export default DeviceStatusDot;
