const { v4: uuidv4 } = require('uuid');

class MockSimulator {
  constructor() {
    this.devices = [
      {
        deviceId: 'ESP32-001',
        name: 'Temperature Sensor',
        type: 'sensor',
        ipAddress: '192.168.1.100',
        location: 'Living Room'
      },
      {
        deviceId: 'ESP32-BF-TEST',
        name: 'Security Camera',
        type: 'camera',
        ipAddress: '192.168.1.101',
        location: 'Front Door'
      },
      {
        deviceId: 'ESP32-DDOS-TEST',
        name: 'Smart Gateway',
        type: 'gateway',
        ipAddress: '192.168.1.102',
        location: 'Network Hub'
      }
    ];
  }

  generateTelemetry(deviceId, type = 'heartbeat') {
    const device = this.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const baseTelemetry = {
      deviceId: deviceId,
      timestamp: new Date().toISOString(),
      type: type,
      data: {
        cpuUsage: Math.random() * 100,
        ramUsage: Math.random() * 100,
        loginStatus: Math.random() > 0.8 ? 'FAIL' : 'SUCCESS',
        packetFrequency: Math.floor(Math.random() * 50),
        authHeader: `Bearer ${uuidv4()}`
      }
    };

    return baseTelemetry;
  }

  generateAttackScenario(deviceId, attackType) {
    const baseTelemetry = this.generateTelemetry(deviceId, 'login');
    
    switch (attackType) {
      case 'brute_force':
        return {
          ...baseTelemetry,
          data: {
            ...baseTelemetry.data,
            loginStatus: 'FAIL',
            packetFrequency: 1
          }
        };
        
      case 'ddos':
        return {
          ...baseTelemetry,
          type: 'traffic_spike',
          data: {
            ...baseTelemetry.data,
            packetFrequency: 100,
            cpuUsage: 95,
            ramUsage: 90
          }
        };
        
      case 'anomaly':
        return {
          ...baseTelemetry,
          data: {
            ...baseTelemetry.data,
            cpuUsage: 98,
            ramUsage: 92,
            packetFrequency: 5
          }
        };
        
      default:
        return baseTelemetry;
    }
  }

  simulateBruteForceAttack(deviceId, attempts = 6) {
    const telemetryData = [];
    
    for (let i = 0; i < attempts; i++) {
      const telemetry = this.generateAttackScenario(deviceId, 'brute_force');
      telemetry.timestamp = new Date(Date.now() + i * 1000).toISOString();
      telemetryData.push(telemetry);
    }
    
    return telemetryData;
  }

  simulateDdosAttack(deviceId, duration = 10000) {
    const telemetryData = [];
    const packets = 5;
    
    for (let i = 0; i < packets; i++) {
      const telemetry = this.generateAttackScenario(deviceId, 'ddos');
      telemetry.timestamp = new Date(Date.now() + i * 2000).toISOString();
      telemetryData.push(telemetry);
    }
    
    return telemetryData;
  }

  generateNormalTelemetry(deviceId, count = 10) {
    const telemetryData = [];
    
    for (let i = 0; i < count; i++) {
      const telemetry = this.generateTelemetry(deviceId, 'heartbeat');
      telemetry.timestamp = new Date(Date.now() + i * 5000).toISOString();
      telemetryData.push(telemetry);
    }
    
    return telemetryData;
  }
}

module.exports = MockSimulator;
