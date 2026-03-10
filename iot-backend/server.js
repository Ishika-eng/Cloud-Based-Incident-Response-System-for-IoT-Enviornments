require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const telemetryRoutes = require('./routes/telemetry');
const incidentRoutes = require('./routes/incidents');
const deviceRoutes = require('./routes/devices');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

global.io = io;

connectDB();

io.on('connection', (socket) => {
  console.log('Dashboard client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Dashboard client disconnected:', socket.id);
  });
});

app.use(cors());
app.use(express.json());

const telemetryLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 100,
  message: { error: 'Too many telemetry requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/telemetry', telemetryLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/devices', deviceRoutes);

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[dbStatus] || 'unknown';
  
  const overallStatus = dbStatus === 1 ? 'ok' : 'degraded';
  
  res.json({
    status: overallStatus,
    uptime: process.uptime(),
    database: dbStatusText
  });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IoT Security Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});
