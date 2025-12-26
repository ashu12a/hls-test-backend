import fs from "fs/promises";
import path from "path";

/**
 * Log cleanup utility - removes log files older than specified days
 */
const LOG_DIR = path.join(process.cwd(), "public", "logs");
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || "7"); // Default 7 days
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once per day

/**
 * Clean up old log files
 */
export async function cleanupOldLogs() {
  try {
    // Check if log directory exists
    try {
      await fs.access(LOG_DIR);
    } catch {
      console.log("📁 Log directory doesn't exist, skipping cleanup");
      return;
    }

    const files = await fs.readdir(LOG_DIR);
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    let deletedCount = 0;
    let totalSizeDeleted = 0;

    for (const file of files) {
      // Only process log files (monitor-*.log and rotated files)
      if (!file.startsWith("monitor-") || !file.includes(".log")) {
        continue;
      }

      const filePath = path.join(LOG_DIR, file);

      try {
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        // Delete if older than retention period
        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          totalSizeDeleted += stats.size;
          console.log(`🗑️ Deleted old log: ${file} (${(fileAge / (24 * 60 * 60 * 1000)).toFixed(1)} days old)`);
        }
      } catch (err) {
        // File might have been deleted by another process, ignore
        if (err.code !== "ENOENT") {
          console.error(`Error processing log file ${file}:`, err.message);
        }
      }
    }

    if (deletedCount > 0) {
      const sizeMB = (totalSizeDeleted / (1024 * 1024)).toFixed(2);
      console.log(`✅ Log cleanup complete: Deleted ${deletedCount} file(s), freed ${sizeMB} MB`);
    } else {
      console.log(`✅ Log cleanup complete: No old files to delete (keeping ${LOG_RETENTION_DAYS} days)`);
    }
  } catch (error) {
    console.error("❌ Error during log cleanup:", error.message);
  }
}

/**
 * Start periodic log cleanup
 */
export function startLogCleanup() {
  console.log(`🧹 Log cleanup scheduled: Will delete logs older than ${LOG_RETENTION_DAYS} days`);
  
  // Run cleanup immediately on startup
  cleanupOldLogs();

  // Then run cleanup daily
  setInterval(() => {
    cleanupOldLogs();
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Get log directory statistics
 */
export async function getLogStats() {
  try {
    const files = await fs.readdir(LOG_DIR);
    const logFiles = files.filter(f => f.startsWith("monitor-") && f.includes(".log"));
    
    let totalSize = 0;
    let fileCount = 0;
    const fileAges = [];

    for (const file of logFiles) {
      try {
        const filePath = path.join(LOG_DIR, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        fileCount++;
        fileAges.push({
          name: file,
          size: stats.size,
          age: Date.now() - stats.mtimeMs,
          modified: stats.mtime
        });
      } catch (err) {
        // Skip files that can't be accessed
      }
    }

    return {
      totalFiles: fileCount,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      retentionDays: LOG_RETENTION_DAYS,
      files: fileAges.sort((a, b) => b.age - a.age) // Sort by age (oldest first)
    };
  } catch (error) {
    return {
      error: error.message,
      totalFiles: 0,
      totalSize: 0
    };
  }
}

