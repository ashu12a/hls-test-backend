# Scalability Analysis: Running 200+ Streams

## 🚨 Critical Issues at 200+ Streams

### 1. **FFmpeg Process Overload**
**Problem:**
- Each stream spawns a separate FFmpeg process
- 200+ FFmpeg processes = 200+ child processes running simultaneously
- Each process consumes:
  - ~50-200MB RAM
  - CPU cycles for video processing
  - File descriptors (sockets, pipes)
  - Network bandwidth

**Impact:**
- System will run out of file descriptors (default limit: 256-1024)
- CPU will be maxed out
- Memory exhaustion
- Process crashes

**Solution:**
- Implement process pooling/queuing
- Batch start streams (e.g., 10-20 at a time)
- Use worker threads or separate worker processes
- Consider using a dedicated streaming server (Nginx-RTMP, Flussonic)

---

### 2. **File Descriptor Exhaustion**
**Problem:**
- Each FFmpeg process uses multiple file descriptors
- Each socket connection uses file descriptors
- Log file operations use file descriptors
- Default OS limit: 256-1024 (varies by OS)

**Impact:**
- `EMFILE: too many open files` errors
- Processes will fail to start
- System instability

**Solution:**
```bash
# Increase system limits
ulimit -n 10000  # For current session
# Or configure in /etc/security/limits.conf
```

**Code Fix:**
- Close unused file descriptors
- Use connection pooling
- Implement file descriptor monitoring

---

### 3. **Memory Leaks & Unbounded Growth**
**Problem:**
- `emitter.setMaxListeners(0)` removes listener limits
- Log buffering accumulates in memory
- Socket.IO rooms accumulate data
- MongoDB queries without limits

**Impact:**
- Memory usage grows indefinitely
- Node.js process will crash
- System becomes unresponsive

**Solution:**
- Set reasonable max listeners (e.g., 1000)
- Implement log rotation
- Clear old socket data
- Add memory monitoring

---

### 4. **Database Connection Pool Exhaustion**
**Problem:**
- No explicit connection pool configuration
- Each channel update triggers DB queries
- Concurrent operations can exhaust pool
- Default Mongoose pool: 5-10 connections

**Impact:**
- Database connection timeouts
- Slow queries
- Application hangs

**Solution:**
```javascript
// In config/db.js
await mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,        // Increase pool size
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
});
```

---

### 5. **Inefficient Log File Operations** ✅ FIXED
**Problem:**
- `getLastStates()` reads entire log file every 3 seconds per socket
- 200+ channels × multiple sockets = thousands of file reads/second
- No log rotation or size limits
- Synchronous file operations block event loop

**Impact:**
- Disk I/O saturation
- Event loop blocking
- Slow response times
- Disk space exhaustion

**Solution Implemented:**
- ✅ Cache log states in memory (2-second TTL)
- ✅ Async file operations (fs/promises)
- ✅ Automatic log rotation (10MB max, keeps 5 rotated files)
- ✅ Configurable via `MAX_LOG_SIZE` and `MAX_LOG_FILES`

---

### 6. **Socket.IO Broadcasting Overhead** ✅ FIXED
**Problem:**
- Broadcasting all 200+ channels every 3 seconds
- No data compression
- Sending full channel objects repeatedly
- No delta updates

**Impact:**
- High network bandwidth usage
- Client-side performance issues
- Server CPU overhead

**Solution Implemented:**
- ✅ Delta updates (only send changed channels)
- ✅ Socket.IO compression enabled
- ✅ Optimized transport (websocket + polling fallback)
- ✅ Separate delta events: `streamsDelta` and `userStreamsDelta`
- ✅ Full data still available for initial load

---

### 7. **Email Alert Spam** ✅ FIXED
**Problem:**
- No rate limiting on email alerts
- 200+ streams can trigger hundreds of emails simultaneously
- SMTP connection limits will be hit
- Email service may blacklist

**Impact:**
- Email delivery failures
- SMTP connection errors
- Service blacklisting

**Solution Implemented:**
- ✅ Email rate limiting (max 1 per channel per alert type per 5 minutes)
- ✅ Email queuing with batch processing (10 emails per batch, 2s delay)
- ✅ Automatic cleanup of rate limit cache
- ✅ Configurable rate limit via `EMAIL_RATE_LIMIT_MS` env variable

---

### 8. **No Resource Monitoring** ✅ FIXED
**Problem:**
- No CPU/memory monitoring
- No process health checks
- No alerting for system issues
- No graceful degradation

**Impact:**
- System crashes without warning
- No visibility into resource usage
- Difficult to debug issues

**Solution Implemented:**
- ✅ Health check endpoint: `/api/v1/info/health`
- ✅ Monitoring stats endpoint: `/api/v1/info/monitoring`
- ✅ File descriptor count monitoring
- ✅ System memory usage tracking
- ✅ Database connection status
- ✅ CPU load average

---

### 9. **Synchronous Operations Blocking Event Loop** ✅ FIXED
**Problem:**
- `fs.readFileSync()` in `getLastStates()`
- Synchronous file operations
- Blocking database operations

**Impact:**
- Event loop blocking
- Slow response times
- Timeouts

**Solution Implemented:**
- ✅ All file operations use `fs/promises` (async)
- ✅ Non-blocking log reads with caching
- ✅ Async database operations throughout
- ✅ Proper error handling for async operations

---

### 10. **No Graceful Shutdown** ✅ FIXED
**Problem:**
- FFmpeg processes not cleaned up on shutdown
- Socket connections not closed properly
- Database connections not closed

**Impact:**
- Orphaned processes
- Resource leaks
- Database connection issues

**Solution Implemented:**
- ✅ Graceful shutdown handlers (SIGTERM, SIGINT)
- ✅ FFmpeg process cleanup with timeout
- ✅ Database connection closure
- ✅ Agenda job cleanup
- ✅ Socket interval cleanup
- ✅ 30-second forced shutdown timeout

---

## 📋 Recommended Improvements

### Priority 1: Critical (Do First)

1. **Implement Process Pooling**
   - Limit concurrent FFmpeg processes (e.g., 50 at a time)
   - Queue remaining streams
   - Use worker processes/threads

2. **Fix File Descriptor Limits**
   - Increase OS limits
   - Monitor file descriptor usage
   - Close unused descriptors

3. **Configure Database Connection Pool**
   - Set appropriate pool size
   - Add connection timeout handling

4. **Fix Memory Leaks**
   - Remove `setMaxListeners(0)`
   - Implement proper cleanup
   - Add memory monitoring

### Priority 2: High (Do Soon)

5. **Optimize Log Operations**
   - Cache log states in memory
   - Use async file operations
   - Implement log rotation

6. **Optimize Socket Broadcasting**
   - Send delta updates only
   - Increase broadcast interval
   - Add compression

7. **Implement Email Rate Limiting**
   - Use job queue (Bull/BullMQ)
   - Rate limit per channel
   - Batch alerts

### Priority 3: Medium (Do Later)

8. **Add Monitoring & Health Checks**
   - System resource monitoring
   - Health check endpoints
   - Alerting

9. **Implement Graceful Shutdown**
   - Clean up processes
   - Close connections properly

10. **Add Error Recovery**
    - Retry mechanisms
    - Circuit breakers
    - Fallback strategies

---

## 🔧 Code Changes Needed

### 1. Database Connection Pool (`config/db.js`)
```javascript
await mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
});
```

### 2. Process Pooling (`utils/hls/hlsMonitorManager.js`)
- Add queue for streams
- Limit concurrent monitors
- Implement batching

### 3. Log Optimization (`socket/index.js`)
- Cache log states in memory
- Use async file operations
- Implement log rotation

### 4. Event Emitter (`utils/hls/hlsMonitorManager.js`)
```javascript
emitter.setMaxListeners(1000); // Instead of 0
```

### 5. Email Queue (`config/mail/mailer.js`) ✅ IMPLEMENTED
- ✅ Email rate limiting (5 minutes per channel per alert type)
- ✅ Email queuing with batch processing
- ✅ Configurable via `EMAIL_RATE_LIMIT_MS` env variable

---

## 🏗️ Architecture Recommendations

### Option 1: Worker Process Architecture
- Main process: API server
- Worker processes: Stream monitoring (1 worker per 20-50 streams)
- Use PM2 cluster mode or Node.js cluster module

### Option 2: Microservices
- API Service: Handles HTTP requests
- Monitoring Service: Handles stream monitoring
- Communication via message queue (Redis/RabbitMQ)

### Option 3: Dedicated Streaming Server
- Use Nginx-RTMP or Flussonic for stream processing
- Your Node.js app monitors the streaming server
- Reduces CPU/memory load on Node.js

---

## 📊 Expected Resource Usage (200 Streams)

### Current Architecture:
- **CPU**: 100%+ (will be maxed out)
- **Memory**: 10-40GB (depending on stream quality)
- **File Descriptors**: 2000+ (will exceed limits)
- **Network**: High (depends on stream bitrates)

### With Optimizations:
- **CPU**: 60-80% (with process pooling)
- **Memory**: 4-8GB (with proper cleanup)
- **File Descriptors**: 500-1000 (manageable)
- **Network**: Same (but better managed)

---

## ✅ Testing Checklist

Before deploying 200+ streams:

- [ ] Test with 50 streams
- [ ] Monitor CPU, memory, file descriptors
- [ ] Test email rate limiting
- [ ] Test graceful shutdown
- [ ] Test database connection pool
- [ ] Test log file rotation
- [ ] Test socket broadcasting performance
- [ ] Test error recovery
- [ ] Load test with gradual increase
- [ ] Monitor for memory leaks

---

## 🚀 Quick Wins (Easy to Implement)

1. Increase file descriptor limits
2. Configure database connection pool
3. Set max listeners to reasonable value
4. Use async file operations
5. Add process monitoring
6. Implement log rotation
7. Add health check endpoint

---

## 📝 Notes

- Consider using a dedicated streaming server for production
- Monitor system resources continuously
- Implement gradual rollout (start with 50, then 100, then 200)
- Have rollback plan ready
- Consider horizontal scaling (multiple servers)

