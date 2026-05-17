const express = require('express');
const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, type, ipAddress, location, baselineTraffic } = req.body;
    
    if (!name || !type || !ipAddress || !location) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type, ipAddress, location' 
      });
    }
    
    if (!['sensor', 'camera', 'gateway', 'actuator'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid device type. Must be: sensor, camera, gateway, or actuator' 
      });
    }
    
    const existingDevice = await Device.findOne({ 
      $or: [{ name }, { ipAddress }] 
    });
    
    if (existingDevice) {
      return res.status(409).json({ 
        error: 'Device with this name or IP address already exists' 
      });
    }
    
    const device = new Device({
      name,
      type,
      ipAddress,
      location,
      baselineTraffic: baselineTraffic || 100
    });
    
    await device.save();
    
    const token = jwt.sign(
      { id: device._id, type: device.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      deviceId: device._id,
      token,
      device: {
        id: device._id,
        name: device.name,
        type: device.type,
        status: device.status,
        ipAddress: device.ipAddress,
        location: device.location
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { deviceId, ipAddress } = req.body;
    
    if (!deviceId || !ipAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: deviceId, ipAddress' 
      });
    }
    
    const device = await Device.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.ipAddress !== ipAddress) {
      return res.status(401).json({ error: 'Invalid IP address' });
    }
    
    if (device.status === 'Blocked') {
      return res.status(403).json({ error: 'Device is blocked' });
    }
    
    const token = jwt.sign(
      { id: device._id, type: device.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    device.lastSeen = new Date();
    await device.save();
    
    res.json({
      deviceId: device._id,
      token,
      device: {
        id: device._id,
        name: device.name,
        type: device.type,
        status: device.status,
        ipAddress: device.ipAddress,
        location: device.location
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
