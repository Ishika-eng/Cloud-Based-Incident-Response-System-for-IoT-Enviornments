const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const deviceSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['sensor', 'camera', 'gateway', 'actuator']
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Blocked'],
    default: 'Active'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  baselineTraffic: {
    type: Number,
    required: true,
    default: 100
  },
  ipAddress: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

deviceSchema.index({ status: 1 });
deviceSchema.index({ lastSeen: 1 });

module.exports = mongoose.model('Device', deviceSchema);