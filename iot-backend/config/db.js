const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 3;
  let retryCount = 0;
  
  const connectWithRetry = async () => {
    try {
      console.log('Connecting to MongoDB...');
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error('MongoDB Connection Failed:', error.message);
      retryCount++;
      
      if (retryCount < maxRetries) {
        console.log(`MongoDB Connection Failed - retrying... (${retryCount}/${maxRetries})`);
        setTimeout(connectWithRetry, 5000 * retryCount);
      } else {
        console.error('Max retry attempts reached. Exiting...');
        process.exit(1);
      }
    }
  };
  
  await connectWithRetry();
  
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });
};

module.exports = connectDB;
