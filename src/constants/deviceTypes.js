export const DEVICE_TYPES = {
    ESP32_CAM: 'ESP32-CAM',
    RASPBERRY_PI_4: 'Raspberry Pi 4',
    ARM_CORTEX_M4: 'ARM Cortex-M4',
    JETSON_NANO: 'Jetson Nano',
    NETWORK_GATEWAY: 'Network Gateway',
    INDUSTRIAL_CONTROLLER: 'Industrial Controller'
};

export const DEVICE_STATUS = {
    ACTIVE: 'Active',
    BLOCKED: 'Blocked',
    COMPROMISED: 'Compromised',
    OFFLINE: 'Offline'
};

export const DEVICE_STATUS_COLORS = {
    [DEVICE_STATUS.ACTIVE]: 'var(--safe)',
    [DEVICE_STATUS.BLOCKED]: 'var(--critical)',
    [DEVICE_STATUS.COMPROMISED]: 'var(--high)',
    [DEVICE_STATUS.OFFLINE]: 'var(--offline)'
};
