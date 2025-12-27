import { channelCategories, languages } from "../utils/constants.js";
import { getMonitoringStats as getMonitorStats } from "../utils/hls/hlsMonitorManager.js";
import { getLogStats, cleanupOldLogs } from "../utils/logCleanup.js";
import mongoose from "mongoose";
import os from "os";
import { execSync } from "child_process";

export const getAllChannelCategories = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      count: channelCategories.length,
      data: channelCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch channel categories"
    });
  }
};


export const getAllLanguages = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      count: languages.length,
      data: languages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch languages"
    });
  }
};

/**
 * Get file descriptor count (cross-platform)
 */
function getFileDescriptorCount() {
  try {
    if (os.platform() === 'linux' || os.platform() === 'darwin') {
      // Use lsof on Linux/macOS
      const pid = process.pid;
      const result = execSync(`lsof -p ${pid} 2>/dev/null | wc -l`, { encoding: 'utf8' });
      return parseInt(result.trim()) || 0;
    }
    // Windows or other - return 0 (not easily accessible)
    return 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Health check endpoint
 */
export const healthCheck = (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };

    // Get file descriptor count
    const fdCount = getFileDescriptorCount();
    const fdLimit = process.resourceUsage ? process.resourceUsage().maxRSS : null;

    // Calculate memory usage percentage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    res.status(200).json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
        external: Math.round(memUsage.external / 1024 / 1024) + " MB",
        systemUsed: Math.round(usedMem / 1024 / 1024) + " MB",
        systemTotal: Math.round(totalMem / 1024 / 1024) + " MB",
        systemUsagePercent: memUsagePercent + "%"
      },
      database: {
        status: dbStates[dbState] || "unknown",
        readyState: dbState
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg(),
        fileDescriptors: {
          current: fdCount,
          limit: process.platform !== 'win32' ? 'check with ulimit -n' : 'N/A'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      message: error.message
    });
  }
};

/**
 * Monitoring stats endpoint (admin only)
 */
export const getMonitoringStats = async (req, res) => {
  try {
    const stats = getMonitorStats();
    const memUsage = process.memoryUsage();
    const logStats = await getLogStats();
    
    res.status(200).json({
      success: true,
      monitoring: stats,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
        external: Math.round(memUsage.external / 1024 / 1024) + " MB"
      },
      database: {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      logs: logStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Manual log cleanup endpoint (admin only)
 */
export const cleanupLogs = async (req, res) => {
  try {
    await cleanupOldLogs();
    const logStats = await getLogStats();
    
    res.status(200).json({
      success: true,
      message: "Log cleanup completed",
      logs: logStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};