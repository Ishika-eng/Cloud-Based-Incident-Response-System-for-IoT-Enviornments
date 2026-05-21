const mongoose = require('mongoose');
require('dotenv').config();
const Device = require('./models/Device');
const Incident = require('./models/Incident');

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('Unblocking all devices...');
    await Device.updateMany({}, { status: 'Active' });
    
    console.log('Clearing all incidents...');
    await Incident.deleteMany({});
    
    console.log('DB Reset Complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

resetDB();
