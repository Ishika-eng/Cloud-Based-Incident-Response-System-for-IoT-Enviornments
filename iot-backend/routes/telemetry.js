const express = require('express');
const Device = require('../models/Device');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const SecurityEngine = require('../SecurityEngine');

const router = express.Router();

const parseTelemetry = (req) => {
  const body = req.body;
  
  if (body.data && body.deviceId && body.timestamp && body.type) {
    const standardized = {
      deviceId: body.deviceId,
      timestamp: body.timestamp,
      type: body.type,
      cpu: body.data.cpuUsage,
      memory: body.data.ramUsage,
      traffic: body.data.packetFrequency,
      loginStatus: body.data.loginStatus,
      authHeader: body.data.authHeader
    };
    
    if (standardized.loginStatus === 'FAIL') {
      standardized.loginAttempts = 1;
    } else if (standardized.loginStatus === 'SUCCESS') {
      standardized.loginAttempts = 0;
    } else {
      standardized.loginAttempts = 0;
    }
    
    return { telemetry: standardized, isStandardFormat: true };
  } else {
    return { telemetry: body, isStandardFormat: false };
  }
};

const validateStandardTelemetry = (body) => {
  const errors = [];
  
  if (!body.deviceId) errors.push('deviceId is required');
  if (!body.timestamp) errors.push('timestamp is required');
  if (!body.type) errors.push('type is required');
  if (!['heartbeat', 'login', 'traffic_spike'].includes(body.type)) {
    errors.push('type must be heartbeat, login, or traffic_spike');
  }
  if (!body.data) errors.push('data object is required');
  
  if (body.data) {
    if (body.data.cpuUsage === undefined) errors.push('data.cpuUsage is required');
    if (body.data.ramUsage === undefined) errors.push('data.ramUsage is required');
    if (body.data.packetFrequency === undefined) errors.push('data.packetFrequency is required');
    if (body.data.loginStatus && !['SUCCESS', 'FAIL'].includes(body.data.loginStatus)) {
      errors.push('data.loginStatus must be SUCCESS or FAIL');
    }
    if (body.data.authHeader) {
      if (typeof body.data.authHeader !== 'string') {
        errors.push('data.authHeader must be a string');
      } else if (!body.data.authHeader.startsWith('Bearer ')) {
        errors.push('data.authHeader must start with "Bearer "');
      }
    }
  }
  
  return errors;
};

router.post('/', auth, async (req, res) => {
  try {
    const body = req.body;
    const device = req.device;
    
    const { telemetry, isStandardFormat } = parseTelemetry(req);
    
    if (isStandardFormat) {
      const validationErrors = validateStandardTelemetry(body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Standard telemetry validation failed', 
          details: validationErrors 
        });
      }
    }
    
    const validationErrors = [];
    
    if (telemetry.cpu !== undefined) {
      if (typeof telemetry.cpu !== 'number' || telemetry.cpu < 0 || telemetry.cpu > 100) {
        validationErrors.push('CPU usage must be a number between 0 and 100');
      }
    }
    
    if (telemetry.memory !== undefined) {
      if (typeof telemetry.memory !== 'number' || telemetry.memory < 0 || telemetry.memory > 100) {
        validationErrors.push('Memory usage must be a number between 0 and 100');
      }
    }
    
    if (telemetry.traffic !== undefined) {
      if (typeof telemetry.traffic !== 'number' || telemetry.traffic < 0) {
        validationErrors.push('Traffic must be a non-negative number');
      }
    }
    
    if (telemetry.loginAttempts !== undefined) {
      if (typeof telemetry.loginAttempts !== 'number' || telemetry.loginAttempts < 0) {
        validationErrors.push('Login attempts must be a non-negative number');
      }
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    device.lastSeen = new Date();
    await device.save();
    
    const threats = await new SecurityEngine().analyzeTelemetry(telemetry, device);
    
    const incidents = [];
    let deviceCompromised = false;
    
    for (const threat of threats) {
      const incident = new Incident({
        deviceId: device._id,
        type: threat.type,
        severity: threat.severity,
        timestamp: new Date()
      });
      
      await incident.save();
      incidents.push(incident);
      
      if (threat.severity === 'Critical') {
        deviceCompromised = true;
      }
      
      if (global.io) {
        global.io.emit('threat-detected', {
          alertId: incident.incidentId,
          deviceId: device._id,
          threatType: threat.type,
          severity: threat.severity,
          timestamp: incident.timestamp,
          details: threat.details,
          status: 'Blocked'
        });
      }
    }
    
    if (deviceCompromised) {
      device.status = 'Blocked';
      await device.save();
      
      if (global.io) {
        global.io.emit('device-compromised', {
          alertId: `ALT-${device._id.toString().slice(-4)}`,
          deviceId: device._id,
          threatType: 'System Compromised',
          severity: 'Critical',
          timestamp: new Date(),
          details: 'Device status changed to Blocked due to critical threats',
          status: 'Blocked',
          device: {
            id: device._id,
            name: device.name,
            type: device.type,
            ipAddress: device.ipAddress,
            location: device.location,
            status: device.status
          }
        });
      }
    }
    
    if (global.io) {
      global.io.emit('live-telemetry', {
        deviceId: device._id,
        timestamp: telemetry.timestamp || new Date(),
        type: telemetry.type || 'heartbeat',
        data: {
          cpuUsage: telemetry.cpu,
          ramUsage: telemetry.memory,
          packetFrequency: telemetry.traffic,
          loginStatus: telemetry.loginStatus,
          authHeader: telemetry.authHeader
        },
        device: {
          id: device._id,
          name: device.name,
          type: device.type,
          status: device.status,
          ipAddress: device.ipAddress,
          location: device.location
        },
        incidents: incidents.map(inc => ({
          alertId: `ALT-${inc._id.toString().slice(-4)}`,
          deviceId: inc.deviceId,
          threatType: inc.attackType,
          severity: inc.severity,
          timestamp: inc.createdAt,
          details: inc.details,
          status: 'Active'
        }))
      });
    }
    
    res.json({
      success: true,
      deviceStatus: device.status,
      threatsDetected: threats.length,
      format: isStandardFormat ? 'standard' : 'legacy',
      incidents: incidents.map(inc => ({
        alertId: inc.incidentId,
        deviceId: inc.deviceId,
        threatType: inc.type,
        severity: inc.severity,
        timestamp: inc.timestamp,
        details: threat.details,
        status: 'Active'
      }))
    });
    
  } catch (error) {
    console.error('Telemetry processing error:', error);
    res.status(500).json({ error: 'Server error processing telemetry' });
  }
});

router.get('/incidents', auth, async (req, res) => {
  try {
    const incidents = await Incident.find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('deviceId', 'name type ipAddress location');
    
    res.json({
      incidents: incidents.map(incident => ({
        incidentId: incident.incidentId,
        deviceId: incident.deviceId._id,
        type: incident.type,
        severity: incident.severity,
        timestamp: incident.timestamp
      }))
    });
    
  } catch (error) {
    console.error('Incidents retrieval error:', error);
    res.status(500).json({ error: 'Server error retrieving incidents' });
  }
});

router.patch('/incidents/:id/resolve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    
    const incident = await Incident.findById(id);
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    incident.resolved = true;
    incident.resolvedAt = new Date();
    if (resolution) {
      incident.details += ` | Resolution: ${resolution}`;
    }
    
    await incident.save();
    
    if (global.io) {
      global.io.emit('incident-resolved', {
        incident: {
          id: incident._id,
          deviceId: incident.deviceId,
          attackType: incident.attackType,
          severity: incident.severity,
          resolvedAt: incident.resolvedAt
        }
      });
    }
    
    res.json({
      success: true,
      incident: {
        id: incident._id,
        resolved: incident.resolved,
        resolvedAt: incident.resolvedAt
      }
    });
    
  } catch (error) {
    console.error('Incident resolution error:', error);
    res.status(500).json({ error: 'Server error resolving incident' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const device = req.device;
    
    const unresolvedIncidents = await Incident.countDocuments({
      deviceId: device._id,
      resolved: false
    });
    
    const recentIncidents = await Incident.find({
      deviceId: device._id
    })
    .sort({ createdAt: -1 })
    .limit(5);
    
    res.json({
      device: {
        id: device._id,
        name: device.name,
        type: device.type,
        status: device.status,
        ipAddress: device.ipAddress,
        location: device.location,
        lastSeen: device.lastSeen,
        baselineTraffic: device.baselineTraffic
      },
      stats: {
        unresolvedIncidents,
        totalIncidents: recentIncidents.length
      },
      recentIncidents: recentIncidents.map(inc => ({
        id: inc._id,
        attackType: inc.attackType,
        severity: inc.severity,
        details: inc.details,
        resolved: inc.resolved,
        createdAt: inc.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Device status retrieval error:', error);
    res.status(500).json({ error: 'Server error retrieving device status' });
  }
});

module.exports = router;
