# 🚀 Railway Deployment Guide

## 📋 Prerequisites
- GitHub repository with backend code
- Railway account (free tier works)
- MongoDB Atlas cluster
- Domain name (optional)

## 🔧 Step 1: Railway Project Setup

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your IoT backend repository
4. Choose **"Node.js"** as the template

### 2. Configure Environment Variables
In Railway dashboard, go to **"Variables"** tab and add:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/iot-security?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-for-production-min-32-chars
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

## 🔧 Step 2: MongoDB Atlas Setup

### 1. Create Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create new cluster (M0 free tier works)
3. Create database user with strong password
4. Add IP whitelist: `0.0.0.0/0` (allows all Railway IPs)

### 2. Get Connection String
1. In Atlas, go to **"Database"** → **"Connect"**
2. Choose **"Drivers"** method
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Add to Railway environment variables

## 🔧 Step 3: Deployment Configuration

### Files Already Created:
- `railway.toml` - Railway configuration
- `Procfile` - Process definition
- `.env.railway` - Environment template

### Automatic Deployment:
Railway will automatically:
1. Detect Node.js application
2. Install dependencies from `package.json`
3. Start with `npm start` command
4. Expose port 5000

## 🚀 Step 4: Deploy & Test

### 1. Deploy
1. Push changes to GitHub
2. Railway will auto-deploy
3. Monitor build logs in Railway dashboard

### 2. Get Your URL
After deployment, Railway provides:
- **Backend URL**: `https://your-project-name.railway.app`
- **API Endpoint**: `https://your-project-name.railway.app/api`

### 3. Test Deployment
```bash
# Health Check
curl https://your-project-name.railway.app/health

# Register Device
curl -X POST https://your-project-name.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"TEST-001","name":"Test Device","type":"sensor","ipAddress":"192.168.1.100","location":"Test"}'

# Send Telemetry
curl -X POST https://your-project-name.railway.app/api/telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"deviceId":"TEST-001","timestamp":"2024-03-05T22:50:00Z","type":"heartbeat","data":{"cpuUsage":25.5,"ramUsage":65.2,"loginStatus":"SUCCESS","packetFrequency":5,"authHeader":"Bearer token"}}'
```

## 🔧 Step 5: Frontend Integration

### Update Frontend API URL
In your React dashboard, update API base URL:
```javascript
const API_BASE_URL = 'https://your-project-name.railway.app';
```

### WebSocket Connection
```javascript
const socket = io('https://your-project-name.railway.app');
socket.on('threat-detected', (alert) => {
  console.log('🚨 Threat detected:', alert);
});
```

## 📊 Monitoring & Logs

### Railway Dashboard
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Builds**: Deployment history
- **Settings**: Environment variables management

### MongoDB Atlas
- **Performance**: Database metrics
- **Collections**: Monitor data growth
- **Indexes**: Query optimization

## 🚨 Troubleshooting

### Common Issues:

#### 1. Database Connection Failed
```bash
# Check MongoDB URI format
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/iot-security?retryWrites=true&w=majority

# Verify IP whitelist in Atlas
# Add 0.0.0.0/0 for Railway access
```

#### 2. Port Binding Issues
```bash
# Ensure server listens on Railway's PORT
const PORT = process.env.PORT || 5000;
```

#### 3. CORS Errors
```bash
# Add frontend domain to CORS origin
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

#### 4. Build Failures
- Check `package.json` for correct start script
- Verify all dependencies are listed
- Check for syntax errors in server.js

## 🔄 CI/CD Integration

### Automatic Deployments:
1. Push to `main` branch → Auto-deploy
2. Create Pull Request → Preview deployment
3. Merge → Production deployment

### Environment Management:
- **Production**: Railway main project
- **Staging**: Separate Railway project
- **Development**: Local testing

## 📈 Scaling

### Railway Auto-Scaling:
- **Free tier**: Shared resources
- **Paid plans**: Dedicated resources
- **Monitoring**: Built-in metrics

### MongoDB Scaling:
- **M0**: 512MB (free)
- **M2+**: Higher performance
- **Atlas**: Automatic scaling available

## 🎯 Production Checklist

- [ ] MongoDB Atlas cluster created and IP whitelisted
- [ ] Railway environment variables configured
- [ ] Frontend API URL updated
- [ ] WebSocket connections tested
- [ ] All team members have access
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Security audit completed

---

**🚀 Your IoT Security Backend is now ready for Railway deployment!**

For team collaboration, share the Railway project URL and MongoDB credentials securely with your team members.
