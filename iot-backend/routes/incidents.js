const express = require('express');
const Incident = require('../models/Incident');
const Device = require('../models/Device');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { severity, deviceId, limit = 50 } = req.query;
    
    const filter = {};
    
    if (severity) {
      filter.severity = severity;
    }
    
    if (deviceId) {
      filter.deviceId = deviceId;
    }
    
    const incidents = await Incident.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('deviceId', 'name type ipAddress location');
    
    res.json({
      incidents: incidents.map(incident => ({
        incidentId: incident.incidentId,
        deviceId: incident.deviceId._id || incident.deviceId,
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

router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body || {};
    
    const incident = await Incident.findOne({ incidentId: id });
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    if (resolution) {
      incident.type += ` | Resolution: ${resolution}`;
    }
    
    await incident.save();
    
    const device = await Device.findById(incident.deviceId);
    
    if (global.io) {
      global.io.emit('incident-resolved', {
        incidentId: incident.incidentId,
        deviceId: incident.deviceId,
        type: incident.type,
        severity: incident.severity,
        timestamp: incident.timestamp
      });
    }
    
    res.json({
      success: true,
      incident: {
        incidentId: incident.incidentId,
        deviceId: incident.deviceId,
        type: incident.type,
        severity: incident.severity,
        timestamp: incident.timestamp
      }
    });
    
  } catch (error) {
    console.error('Incident resolution error:', error);
    res.status(500).json({ error: 'Server error resolving incident' });
  }
});

module.exports = router;
