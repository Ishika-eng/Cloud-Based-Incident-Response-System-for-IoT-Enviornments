const Incident = require('./models/Incident');

class SecurityEngine {
  constructor() {
    this.threatThresholds = {
      ddos: 10,
      bruteForceAttempts: 5,
      bruteForceTimeWindow: 10000, // 10 seconds
      cpuThreshold: 95,
      memoryThreshold: 90
    };
  }

  async analyzeTelemetry(telemetry, device) {
    const threats = [];
    const { cpuUsage, ramUsage, loginStatus, packetFrequency, authHeader } = telemetry.data;
    
    // DDoS Detection
    if (packetFrequency > this.threatThresholds.ddos) {
      threats.push({
        type: 'DDoS',
        severity: 'High',
        details: `High traffic detected: ${packetFrequency} packets in ${this.threatThresholds.bruteForceTimeWindow / 1000}s.`
      });
    }
    
    // Brute Force Detection
    if (loginStatus === 'FAIL') {
      const recentFailures = await this.countRecentFailures(device._id);
      
      if (recentFailures >= this.threatThresholds.bruteForceAttempts) {
        threats.push({
          type: 'Brute Force',
          severity: 'Critical',
          details: `${recentFailures + 1} failed login attempts in ${this.threatThresholds.bruteForceTimeWindow / 1000}s.`
        });
      }
    }
    
    // CPU Anomaly Detection
    if (cpuUsage > this.threatThresholds.cpuThreshold) {
      threats.push({
        type: 'Anomaly',
        severity: 'Medium',
        details: `CPU anomaly detected: Usage at ${cpuUsage}%`
      });
    }
    
    // Memory Anomaly Detection
    if (ramUsage > this.threatThresholds.memoryThreshold) {
      threats.push({
        type: 'Anomaly',
        severity: 'Low',
        details: `Memory anomaly detected: Usage at ${ramUsage}%`
      });
    }
    
    // Auth Header Validation
    if (authHeader && !authHeader.startsWith('Bearer ')) {
      threats.push({
        type: 'Unauthorized Access',
        severity: 'Medium',
        details: 'Access denied: Invalid or missing authentication token.'
      });
    }
    
    return threats;
  }

  async countRecentFailures(deviceId) {
    const timeWindow = new Date(Date.now() - this.threatThresholds.bruteForceTimeWindow);
    
    const count = await Incident.countDocuments({
      deviceId: deviceId,
      type: 'Brute Force',
      timestamp: { $gte: timeWindow }
    });
    
    return count;
  }

  validateAuthHeader(authHeader) {
    if (!authHeader) {
      return { valid: false, error: 'Missing authentication header' };
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Invalid authentication header format' };
    }
    
    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      return { valid: false, error: 'Invalid token length' };
    }
    
    return { valid: true };
  }

  getThreatSeverity(threatType) {
    const severityMap = {
      'DDoS': 'High',
      'Brute Force': 'Critical',
      'Anomaly': 'Medium',
      'Unauthorized Access': 'Medium',
      'Unknown': 'Low'
    };
    
    return severityMap[threatType] || 'Low';
  }

  generateAlert(incident, device) {
    return {
      alertId: incident.incidentId,
      deviceId: device._id,
      threatType: incident.type,
      severity: incident.severity,
      timestamp: incident.timestamp,
      details: incident.type,
      status: 'Blocked'
    };
  }
}

module.exports = SecurityEngine;
