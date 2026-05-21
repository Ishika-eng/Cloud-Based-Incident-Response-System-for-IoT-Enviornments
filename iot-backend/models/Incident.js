const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const incidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ALT-${uuidv4().slice(0, 8)}`
  },
  deviceId: {
    type: String,
    required: true,
    ref: 'Device'
  },
  type: {
    type: String,
    required: true,
    enum: ['DDoS', 'Brute Force', 'Anomaly', 'Unauthorized', 'Rogue Device', 'Unknown']
  },
  severity: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical']
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  details: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

incidentSchema.index({ deviceId: 1 });
incidentSchema.index({ type: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
