import { useState } from 'react';

export const useTimeRange = (initialRange = '7d') => {
    const [timeRange, setTimeRange] = useState(initialRange);
    return [timeRange, setTimeRange];
};
