const axios = require('axios');

async function testSystem() {
  console.log('=== IoT Incident Response System Test ===');
  
  try {
    // 1. Register Device
    console.log('\n1. Registering device...');
    const regResponse = await axios.post('http://localhost:5000/api/auth/register', {
      deviceId: `SYSTEM-TEST-${Date.now()}`,
      name: 'System Test Device',
      type: 'sensor',
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      location: 'Test Lab'
    });
    
    console.log('Device registered:', regResponse.data.deviceId);
    console.log('Token received:', regResponse.data.token ? 'SUCCESS' : 'FAILED');
    
    const token = regResponse.data.token;
    
    // 2. Send Normal Telemetry
    console.log('\n2. Sending normal telemetry...');
    const normalResponse = await axios.post('http://localhost:5000/api/telemetry', {
      deviceId: 'SYSTEM-TEST-001',
      timestamp: new Date().toISOString(),
      type: 'heartbeat',
      data: {
        cpuUsage: 25.5,
        ramUsage: 65.2,
        loginStatus: 'SUCCESS',
        packetFrequency: 5,
        authHeader: `Bearer ${token}`
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Normal telemetry - Success:', normalResponse.data.success);
    console.log('Format:', normalResponse.data.format);
    console.log('Threats detected:', normalResponse.data.threatsDetected);
    
    // 3. Send Brute Force Attack
    console.log('\n3. Simulating brute force attack...');
    for (let i = 1; i <= 6; i++) {
      const bruteResponse = await axios.post('http://localhost:5000/api/telemetry', {
        deviceId: 'SYSTEM-TEST-001',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        type: 'login',
        data: {
          cpuUsage: 30.1,
          ramUsage: 70.5,
          loginStatus: 'FAIL',
          packetFrequency: 1,
          authHeader: `Bearer ${token}`
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Attempt ${i} - Threats detected: ${bruteResponse.data.threatsDetected}`);
      
      if (bruteResponse.data.threatsDetected > 0) {
        console.log('🚨 BRUTE FORCE ATTACK DETECTED! 🚨');
        console.log('Alert details:', JSON.stringify(bruteResponse.data.incidents[0], null, 2));
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 4. Send DDoS Attack
    console.log('\n4. Simulating DDoS attack...');
    const ddosResponse = await axios.post('http://localhost:5000/api/telemetry', {
      deviceId: 'SYSTEM-TEST-001',
      timestamp: new Date().toISOString(),
      type: 'traffic_spike',
      data: {
        cpuUsage: 95.0,
        ramUsage: 90.0,
        loginStatus: 'SUCCESS',
        packetFrequency: 100,
        authHeader: `Bearer ${token}`
      }
    }, {
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
    
    // 5. Check Incidents
    console.log('\n5. Retrieving incidents...');
    const incidentsResponse = await axios.get('http://localhost:5000/api/incidents', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Total incidents recorded:', incidentsResponse.data.incidents.length);
    incidentsResponse.data.incidents.forEach((incident, index) => {
      console.log(`Incident ${index + 1}:`, incident);
    });
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSystem();
