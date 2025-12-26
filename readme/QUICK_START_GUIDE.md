# Quick Start Guide: Running 200+ Streams

## ✅ Improvements Made

### 1. **Database Connection Pooling**
- Increased pool size to handle concurrent operations
- Added connection timeout handling
- Added connection event listeners

### 2. **Process Pooling/Queuing**
- Limited concurrent FFmpeg processes (default: 50)
- Queues excess streams automatically
- Batches stream starts to avoid overwhelming system

### 3. **Log File Optimization**
- Async file operations (non-blocking)
- Caching (2-second TTL) to reduce I/O
- Proper error handling

### 4. **Event Emitter Fix**
- Set max listeners to 1000 (instead of unlimited)
- Prevents memory leaks

### 5. **Graceful Shutdown**
- Proper cleanup of all processes
- Database connection closure
- Agenda job cleanup

### 6. **Monitoring & Health Checks**
- Health check endpoint: `/api/v1/info/health`
- Monitoring stats endpoint: `/api/v1/info/monitoring`
- System resource tracking

---

## 🔧 Environment Variables

Add these to your `.env` file:

```bash
# Existing variables
MONGO_URI=your_mongodb_connection_string
PORT=3050
JWT_SECRET=your_jwt_secret

# New variables for scaling
MAX_CONCURRENT_MONITORS=50          # Max FFmpeg processes at once
MONITOR_START_DELAY=100             # Delay between starting monitors (ms)
EMAIL_RATE_LIMIT_MS=300000          # Email rate limit (5 minutes in ms)
MAX_LOG_SIZE=10485760               # Max log file size (10MB in bytes)
MAX_LOG_FILES=5                     # Number of rotated log files to keep
LOG_RETENTION_DAYS=7                # Keep logs for 7 days (auto cleanup)

# SMTP (existing)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USERNAME=your_email
SMTP_PASSWORD=your_password
ALERT_EMAIL=ashutosh.sharma@ottlive.in
PRODUCTION=true
```

### Recommended Values for 200+ Streams:

```bash
# Conservative (safer, slower startup)
MAX_CONCURRENT_MONITORS=30
MONITOR_START_DELAY=200

# Balanced (recommended)
MAX_CONCURRENT_MONITORS=50
MONITOR_START_DELAY=100

# Aggressive (faster, more resource intensive)
MAX_CONCURRENT_MONITORS=75
MONITOR_START_DELAY=50
```

---

## 🚀 System Requirements

### Minimum (for 200 streams):
- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Disk**: 50GB+ (for logs)
- **Network**: High bandwidth
- **File Descriptors**: 10,000+ limit

### Recommended:
- **CPU**: 16+ cores
- **RAM**: 32GB+
- **Disk**: 100GB+ SSD
- **Network**: Dedicated high-speed connection
- **File Descriptors**: 20,000+ limit

---

## 📋 Pre-Deployment Checklist

### 1. Increase File Descriptor Limits

**Linux/macOS:**
```bash
# Check current limit
ulimit -n

# Increase for current session
ulimit -n 10000

# Permanent (Linux)
sudo nano /etc/security/limits.conf
# Add:
* soft nofile 20000
* hard nofile 20000

# Permanent (macOS)
sudo launchctl limit maxfiles 20000 20000
```

### 2. Monitor System Resources

```bash
# Install monitoring tools
npm install -g pm2

# Or use system monitoring
htop  # CPU/Memory
iotop # Disk I/O
```

### 3. Test Gradually

1. Start with 10 streams
2. Monitor for 1 hour
3. Increase to 50 streams
4. Monitor for 2 hours
5. Increase to 100 streams
6. Monitor for 4 hours
7. Increase to 200 streams

---

## 🔍 Monitoring Endpoints

### Health Check (Public)
```bash
GET /api/v1/info/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "rss": "500 MB",
    "heapUsed": "200 MB"
  },
  "database": {
    "status": "connected"
  }
}
```

### Monitoring Stats (Admin Only)
```bash
GET /api/v1/info/monitoring
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "monitoring": {
    "active": 45,
    "queued": 155,
    "total": 200,
    "maxConcurrent": 50
  },
  "memory": {
    "heapUsed": "2.5 GB"
  },
  "logs": {
    "totalFiles": 150,
    "totalSizeMB": "125.50",
    "retentionDays": 7
  }
}
```

### Manual Log Cleanup (Admin Only)
```bash
POST /api/v1/info/logs/cleanup
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "message": "Log cleanup completed",
  "logs": {
    "totalFiles": 120,
    "totalSizeMB": "98.30",
    "retentionDays": 7
  }
}
```

---

## ⚠️ Common Issues & Solutions

### Issue: "EMFILE: too many open files"
**Solution:**
- Increase file descriptor limit (see above)
- Check with: `lsof | wc -l`

### Issue: High CPU Usage
**Solution:**
- Reduce `MAX_CONCURRENT_MONITORS`
- Increase `MONITOR_START_DELAY`
- Consider using dedicated streaming server

### Issue: Memory Leaks
**Solution:**
- Check with: `node --inspect index.js`
- Monitor heap usage via health endpoint
- Restart periodically (use PM2 auto-restart)

### Issue: Database Connection Errors
**Solution:**
- Check MongoDB connection pool settings
- Verify network connectivity
- Check MongoDB server logs

### Issue: Email Delivery Failures
**Solution:**
- ✅ Email rate limiting implemented (5 min per channel per alert type)
- ✅ Email queuing with batch processing
- Check SMTP credentials
- Adjust `EMAIL_RATE_LIMIT_MS` if needed

---

## 🏗️ Architecture Recommendations

### Option 1: Single Server (Current)
- Good for: Up to 200 streams
- Requires: High-end server
- Pros: Simple, easy to manage
- Cons: Single point of failure

### Option 2: Worker Processes (Recommended for 200+)
- Use PM2 cluster mode
- 1 main process + N worker processes
- Each worker handles 20-50 streams
- Better resource utilization

### Option 3: Microservices
- API Service: HTTP requests
- Monitoring Service: Stream monitoring
- Communication via Redis/RabbitMQ
- Best for: 500+ streams

---

## 📊 Performance Metrics to Monitor

1. **CPU Usage**: Should stay below 80%
2. **Memory Usage**: Monitor heap growth
3. **File Descriptors**: Should stay below 80% of limit
4. **Database Connections**: Should stay below pool size
5. **Network Bandwidth**: Monitor incoming/outgoing
6. **Disk I/O**: Log file writes
7. **FFmpeg Process Count**: Should match active monitors

---

## 🔄 Deployment Steps

1. **Backup current system**
2. **Update code** with improvements
3. **Set environment variables**
4. **Increase file descriptor limits**
5. **Test with small number** (10 streams)
6. **Monitor for 1 hour**
7. **Gradually increase** to target
8. **Set up monitoring alerts**
9. **Configure auto-restart** (PM2)

---

## 🛠️ Maintenance

### Daily:
- Check health endpoint
- Monitor memory usage
- Check error logs

### Weekly:
- Review log file sizes
- Clean up old logs
- Check database performance

### Monthly:
- Review system resource usage
- Optimize based on metrics
- Update dependencies

---

## ✅ Completed Improvements

1. **Email Queue System** ✅
   - ✅ Rate limit emails (5 min per channel per alert type)
   - ✅ Batch alerts (10 per batch, 2s delay)
   - ✅ Automatic cleanup

2. **Log Rotation** ✅
   - ✅ Automatic log file rotation (10MB max)
   - ✅ Keeps 5 rotated files
   - ✅ **Automatic cleanup: Deletes logs older than 7 days**
   - ✅ Runs daily cleanup automatically
   - ✅ Manual cleanup endpoint available
   - ✅ Configurable retention period (`LOG_RETENTION_DAYS`)

3. **Delta Updates for Socket.IO** ✅
   - ✅ Send only changed data
   - ✅ Reduce network bandwidth
   - ✅ Compression enabled
   - ✅ Separate delta events

4. **Error Recovery** ✅
   - ✅ FFmpeg retry with exponential backoff
   - ✅ Max restart attempts
   - ✅ Proper cleanup on stop

5. **Resource Monitoring** ✅
   - ✅ Health check endpoint
   - ✅ Monitoring stats endpoint
   - ✅ File descriptor tracking
   - ✅ Memory usage tracking

## 📝 Future Improvements (Optional)

1. **Horizontal Scaling**
   - Multiple monitoring servers
   - Load balancing
   - Shared state (Redis)

2. **Dedicated Streaming Server**
   - Use Nginx-RTMP or Flussonic
   - Offload video processing
   - Better performance

3. **Advanced Monitoring**
   - Integration with PM2/New Relic/DataDog
   - Automated alerting
   - Performance dashboards

---

## 🆘 Support

If you encounter issues:

1. Check health endpoint
2. Review logs: `public/logs/`
3. Check system resources
4. Review monitoring stats
5. Check database connections

For critical issues, check:
- System file descriptor limit
- MongoDB connection pool
- Memory usage
- CPU usage
- Network connectivity

