# Automatic Log Cleanup - 7 Days Retention

## ✅ Feature Overview

The system now automatically cleans up log files older than 7 days to keep your disk space clean and manageable.

## 🔧 How It Works

### Automatic Cleanup
- **Runs daily** at server startup and then every 24 hours
- **Deletes logs older than 7 days** based on file modification date
- **Handles rotated logs** - cleans up both main logs and rotated files (`.log.1`, `.log.2`, etc.)
- **Safe operation** - only processes log files (`monitor-*.log`)

### Configuration

Add to your `.env` file:
```bash
LOG_RETENTION_DAYS=7    # Keep logs for 7 days (default)
```

**Options:**
- `LOG_RETENTION_DAYS=7` - Keep 7 days (default, recommended)
- `LOG_RETENTION_DAYS=14` - Keep 14 days
- `LOG_RETENTION_DAYS=30` - Keep 30 days
- `LOG_RETENTION_DAYS=3` - Keep only 3 days

## 📊 Monitoring

### Check Log Statistics

**Endpoint:** `GET /api/v1/info/monitoring`

Response includes log statistics:
```json
{
  "logs": {
    "totalFiles": 150,
    "totalSizeMB": "125.50",
    "retentionDays": 7,
    "files": [
      {
        "name": "monitor-123.log",
        "size": 1048576,
        "age": 172800000,
        "modified": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### Manual Cleanup

**Endpoint:** `POST /api/v1/info/logs/cleanup`
**Authorization:** Required (admin token)

Manually trigger log cleanup:
```bash
curl -X POST http://localhost:5000/api/v1/info/logs/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗂️ What Gets Cleaned

### Files Deleted:
- `monitor-{channelId}.log` - Main log files older than 7 days
- `monitor-{channelId}.log.1` - Rotated files older than 7 days
- `monitor-{channelId}.log.2` - Rotated files older than 7 days
- `monitor-{channelId}.log.3` - Rotated files older than 7 days
- `monitor-{channelId}.log.4` - Rotated files older than 7 days
- `monitor-{channelId}.log.5` - Rotated files older than 7 days

### Files Preserved:
- Logs newer than 7 days
- Non-log files in the logs directory
- Files that don't match the `monitor-*.log` pattern

## 📝 Log Output

When cleanup runs, you'll see:
```
🧹 Log cleanup scheduled: Will delete logs older than 7 days
🗑️ Deleted old log: monitor-123.log (8.5 days old)
🗑️ Deleted old log: monitor-456.log.2 (10.2 days old)
✅ Log cleanup complete: Deleted 15 file(s), freed 125.50 MB
```

Or if no cleanup needed:
```
✅ Log cleanup complete: No old files to delete (keeping 7 days)
```

## ⚙️ Technical Details

### Cleanup Schedule
- **First run:** Immediately on server startup
- **Subsequent runs:** Every 24 hours (daily)

### File Age Calculation
- Uses file modification time (`mtime`)
- Compares against current time
- Deletes if `age > LOG_RETENTION_DAYS * 24 hours`

### Safety Features
- Only processes log files (starts with `monitor-` and contains `.log`)
- Ignores errors for files already deleted
- Continues processing even if individual files fail
- Non-blocking operation

## 💾 Disk Space Savings

### Example with 200 Streams:
- **Without cleanup:** Logs grow indefinitely (could be 100GB+)
- **With 7-day cleanup:** ~50-100MB per day × 7 days = ~350-700MB max
- **Savings:** Prevents disk space exhaustion

### Calculation:
- Average log size: ~500KB per channel per day
- 200 channels × 500KB = 100MB per day
- 7 days retention = ~700MB maximum
- Old logs automatically deleted = Clean disk!

## 🔍 Troubleshooting

### Check if cleanup is running:
Look for these log messages:
- `🧹 Log cleanup scheduled: Will delete logs older than 7 days`
- `✅ Log cleanup complete: ...`

### Verify cleanup worked:
1. Check monitoring endpoint: `GET /api/v1/info/monitoring`
2. Look at `logs.totalFiles` and `logs.totalSizeMB`
3. Check server logs for cleanup messages

### Manual cleanup:
If you need to clean up immediately:
```bash
POST /api/v1/info/logs/cleanup
```

## 📋 Best Practices

1. **Set appropriate retention:**
   - Production: 7 days (default)
   - Debugging: 14-30 days
   - Development: 3-7 days

2. **Monitor disk usage:**
   - Check `/api/v1/info/monitoring` regularly
   - Watch `logs.totalSizeMB` to ensure it's reasonable

3. **Adjust if needed:**
   - If you need longer retention, increase `LOG_RETENTION_DAYS`
   - If disk space is tight, decrease to 3-5 days

## ✅ Summary

- ✅ Automatic daily cleanup
- ✅ Keeps only 7 days of logs (configurable)
- ✅ Handles rotated log files
- ✅ Safe and non-blocking
- ✅ Manual cleanup endpoint available
- ✅ Log statistics in monitoring endpoint
- ✅ Prevents disk space exhaustion

Your logs will stay clean automatically! 🎉

