const jwt = require('jsonwebtoken');
const Device = require('../models/Device');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const device = await Device.findById(decoded.id);
      if (!device) {
        return res.status(401).json({ error: 'Invalid token. Device not found.' });
      }
      
      if (device.status === 'Blocked' && !req.path.includes('unblock')) {
        return res.status(403).json({ error: 'Device is blocked.' });
      }
      
      req.device = device;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error in authentication.' });
  }
};

module.exports = auth;
