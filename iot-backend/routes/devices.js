const express = require('express');
const Device = require('../models/Device');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    const devices = await Device.find(filter)
      .sort({ lastSeen: -1 });
    
    const deviceStats = await Promise.all(
      devices.map(async (device) => {
        const unresolvedIncidents = await Incident.countDocuments({
          deviceId: device._id,
          resolved: false
        });
        
        return {
          id: device._id,
          name: device.name,
          type: device.type,
          status: device.status,
          ipAddress: device.ipAddress,
          location: device.location,
          lastSeen: device.lastSeen,
          baselineTraffic: device.baselineTraffic,
          unresolvedIncidents
        };
      })
    );
    
    res.json({
      devices: deviceStats
    });
    
  } catch (error) {
    console.error('Devices retrieval error:', error);
    res.status(500).json({ error: 'Server error retrieving devices' });
  }
});

router.patch('/:id/block', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findById(id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.status === 'Blocked') {
      return res.status(400).json({ error: 'Device is already blocked' });
    }
    
    device.status = 'Blocked';
    await device.save();
    
    if (global.io) {
      global.io.emit('device-blocked', {
        device: {
          id: device._id,
          name: device.name,
          type: device.type,
          status: device.status,
          ipAddress: device.ipAddress,
          location: device.location,
          lastSeen: device.lastSeen
        }
      });
    }
    
    res.json({
      success: true,
      device: {
        id: device._id,
        name: device.name,
        status: device.status
      }
    });
    
  } catch (error) {
    console.error('Device blocking error:', error);
    res.status(500).json({ error: 'Server error blocking device' });
  }
});

router.patch('/:id/unblock', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findById(id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.status !== 'Blocked') {
      return res.status(400).json({ error: 'Device is not blocked' });
    }
    
    device.status = 'Active';
    await device.save();
    
    if (global.io) {
      global.io.emit('device-unblocked', {
        device: {
          id: device._id,
          name: device.name,
          type: device.type,
          status: device.status,
          ipAddress: device.ipAddress,
          location: device.location,
          lastSeen: device.lastSeen
        }
      });
    }
    
    res.json({
      success: true,
      device: {
        id: device._id,
        name: device.name,
        status: device.status
      }
    });
    
  } catch (error) {
    console.error('Device unblocking error:', error);
    res.status(500).json({ error: 'Server error unblocking device' });
  }
});

module.exports = router;
