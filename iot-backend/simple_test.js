const axios = require('axios');

async function simpleTest() {
  console.log('=== Simple System Test ===');
  
  try {
    // 1. Test Health
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('Health status:', healthResponse.data.status);
    console.log('Database:', healthResponse.data.database);
    
    // 2. Register Device
    console.log('\n2. Registering device...');
    const regResponse = await axios.post('http://localhost:5000/api/auth/register', {
      deviceId: `SIMPLE-TEST-${Date.now()}`,
      name: 'Simple Test Device',
      type: 'sensor',
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      location: 'Test Lab'
    });
    
    console.log('Device registered:', regResponse.data.deviceId);
    console.log('Token received:', regResponse.data.token ? 'SUCCESS' : 'FAILED');
    
    const token = regResponse.data.token;
    
    // 3. Send Normal Telemetry
    console.log('\n3. Sending normal telemetry...');
    const normalTelemetry = {
      deviceId: regResponse.data.deviceId,
      timestamp: new Date().toISOString(),
      type: 'heartbeat',
      data: {
        cpuUsage: 25.5,
        ramUsage: 65.2,
        loginStatus: 'SUCCESS',
        packetFrequency: 5,
        authHeader: `Bearer ${token}`
      }
    };
    
    const telemetryResponse = await axios.post('http://localhost:5000/api/telemetry', normalTelemetry, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Telemetry success:', telemetryResponse.data.success);
    console.log('Format:', telemetryResponse.data.format);
    console.log('Threats detected:', telemetryResponse.data.threatsDetected);
    
    // 4. Send DDoS Attack
    console.log('\n4. Simulating DDoS attack...');
    const ddosTelemetry = {
      deviceId: regResponse.data.deviceId,
      timestamp: new Date().toISOString(),
      type: 'traffic_spike',
      data: {
        cpuUsage: 95.0,
        ramUsage: 90.0,
        loginStatus: 'SUCCESS',
        packetFrequency: 100,
        authHeader: `Bearer ${token}`
      }
    };
    
    const ddosResponse = await axios.post('http://localhost:5000/api/telemetry', ddosTelemetry, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('DDoS attack - Success:', ddosResponse.data.success);
    console.log('Threats detected:', ddosResponse.data.threatsDetected);
    
    if (ddosResponse.data.threatsDetected > 0) {
      console.log('🚨 DDoS ATTACK DETECTED! 🚨');
      console.log('Alert details:', JSON.stringify(ddosResponse.data.incidents[0], null, 2));
    }
    
    console.log('\n=== SIMPLE TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

simpleTest();
