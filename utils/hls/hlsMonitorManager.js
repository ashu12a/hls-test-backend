import EventEmitter from "events";
import createHLSMonitor from "./hlsMonitor.js";
import Channel from "../../models/channelModel.js";
import mongoose from "mongoose";

const emitter = new EventEmitter();
// Set reasonable max listeners instead of unlimited (0)
// 1000 should be enough for 200+ streams with multiple listeners each
emitter.setMaxListeners(1000);

/**
 * key = channelId
 * value = { channel, monitor }
 */
const runningChannels = new Map();

let emitIntervalStarted = false;

// Process pooling configuration
const MAX_CONCURRENT_MONITORS = parseInt(process.env.MAX_CONCURRENT_MONITORS || "50");
const MONITOR_START_DELAY = parseInt(process.env.MONITOR_START_DELAY || "100"); // ms between starts
const pendingChannels = [];
let activeMonitorCount = 0;

/**
 * Start monitor for a single channel (SAFE)
 */
function startChannelMonitor(channel) {
  const channelId = channel._id.toString();

  // ⛔ Already running → skip
  if (runningChannels.has(channelId)) return;

  // If we're at max capacity, queue it
  if (activeMonitorCount >= MAX_CONCURRENT_MONITORS) {
    if (!pendingChannels.find(c => c._id.toString() === channelId)) {
      pendingChannels.push(channel);
      console.log(`⏳ Monitor queued (${pendingChannels.length} in queue):`, channel.name);
    }
    return;
  }

  // Start the monitor
  activeMonitorCount++;
  const monitor = createHLSMonitor({
    streamUrl: channel.url,
    emitter,
    channelId: channel?._id.toString(),
    channelName: channel.name,
    channel
  });

  runningChannels.set(channelId, {
    channel,
    monitor
  });
  console.log(`▶️ Monitor started (${activeMonitorCount}/${MAX_CONCURRENT_MONITORS}):`, channel.name);

  // Process next in queue after a delay
  if (pendingChannels.length > 0) {
    setTimeout(() => {
      const nextChannel = pendingChannels.shift();
      if (nextChannel) {
        startChannelMonitor(nextChannel);
      }
    }, MONITOR_START_DELAY);
  }
}

/**
 * Process queued channels
 */
function processQueue() {
  while (pendingChannels.length > 0 && activeMonitorCount < MAX_CONCURRENT_MONITORS) {
    const channel = pendingChannels.shift();
    if (channel) {
      startChannelMonitor(channel);
    }
  }
}

/**
 * Initial load (server start)
 */
async function startHLSMonitor() {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("MongoDB connection timeout"));
        }, 10000);
        
        if (mongoose.connection.readyState === 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
          mongoose.connection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }
      });
    }

    const channels = await Channel.find({
      $expr: {
        $and: [
          { $eq: [{ $type: "$url" }, "string"] },
          { $gt: [{ $strLenCP: "$url" }, 5] }
        ]
      }
    }).populate("author");

    console.log(`📊 Found ${channels.length} channels to monitor`);
    console.log(`⚙️  Max concurrent monitors: ${MAX_CONCURRENT_MONITORS}`);

    // Start monitors with batching to avoid overwhelming the system
    channels.forEach((channel, index) => {
      setTimeout(() => {
        startChannelMonitor(channel);
      }, index * MONITOR_START_DELAY);
    });

    startEmitLoop();
  } catch (error) {
    console.error("Error starting HLS monitor:", error.message);
    // Don't throw, allow server to continue
  }
}

/**
 * Call this AFTER adding a new channel
 */
async function refreshChannels() {
  try {
    // Check MongoDB connection before querying
    if (mongoose.connection.readyState !== 1) {
      console.warn("⚠️ MongoDB not connected, skipping channel refresh");
      return;
    }

    const channels = await Channel.find({
      $expr: {
        $and: [
          { $eq: [{ $type: "$url" }, "string"] },
          { $gt: [{ $strLenCP: "$url" }, 5] }
        ]
      }
    }).populate("author");

    const dbIds = new Set(channels.map(c => c._id.toString()));

    // ⛔ STOP deleted channels
    for (const [id, data] of runningChannels.entries()) {
      if (!dbIds.has(id)) {
        data.monitor.stop();
        runningChannels.delete(id);
        activeMonitorCount = Math.max(0, activeMonitorCount - 1);
        console.log("🗑️ Channel stopped & removed:", id);
      }
    }

    // Remove from queue if present
    const runningIds = new Set(Array.from(runningChannels.keys()));
    for (let i = pendingChannels.length - 1; i >= 0; i--) {
      const channelId = pendingChannels[i]._id.toString();
      if (runningIds.has(channelId)) {
        pendingChannels.splice(i, 1);
      }
    }

    // Start new channels (will queue if at capacity)
    channels.forEach(startChannelMonitor);
    
    // Process queue
    processQueue();
  } catch (error) {
    console.error("Error refreshing channels:", error.message);
    // Don't throw, allow application to continue
  }
}

/**
 * Emits stream data every 3 seconds with delta updates (ONLY ONCE)
 */
let lastEmittedChannels = new Map(); // Store last emitted state for delta comparison

function startEmitLoop() {
  if (emitIntervalStarted) return;
  emitIntervalStarted = true;

  setInterval(() => {
    const allChannels = Array.from(runningChannels.values()).map(v => v.channel);

    // Create delta updates - only send changed channels
    const changedChannels = allChannels.filter(channel => {
      const channelId = channel._id.toString();
      const lastChannel = lastEmittedChannels.get(channelId);
      
      if (!lastChannel) {
        return true; // New channel, include it
      }

      // Compare key fields that might change
      const hasChanged = 
        lastChannel.log !== channel.log ||
        lastChannel.url !== channel.url ||
        lastChannel.name !== channel.name ||
        lastChannel.updatedAt?.toString() !== channel.updatedAt?.toString();

      return hasChanged;
    });

    // Update last emitted state
    allChannels.forEach(channel => {
      const channelId = channel._id.toString();
      lastEmittedChannels.set(channelId, {
        _id: channel._id,
        log: channel.log,
        url: channel.url,
        name: channel.name,
        updatedAt: channel.updatedAt
      });
    });

    // Emit full data for admin (they need all data)
    emitter.emit("streams", allChannels);

    // Emit delta updates for efficiency
    if (changedChannels.length > 0) {
      emitter.emit("streamsDelta", {
        changed: changedChannels,
        timestamp: Date.now()
      });
    }

    // Author-wise data (only changed channels)
    const authorWiseData = allChannels.reduce((acc, item) => {
      const authorId = item.author?._id.toString();
      if (!authorId) return acc;

      acc[authorId] = acc[authorId] || [];
      acc[authorId].push(item);
      return acc;
    }, {});

    // Only emit changed channels per author
    const authorWiseDelta = changedChannels.reduce((acc, item) => {
      const authorId = item.author?._id.toString();
      if (!authorId) return acc;

      acc[authorId] = acc[authorId] || [];
      acc[authorId].push(item);
      return acc;
    }, {});

    // Emit full data for users (for now, can be optimized later)
    Object.values(authorWiseData).forEach(userChannels => {
      emitter.emit("userStreams", userChannels);
    });

    // Emit delta for users
    Object.entries(authorWiseDelta).forEach(([authorId, userChannels]) => {
      emitter.emit("userStreamsDelta", {
        authorId,
        changed: userChannels,
        timestamp: Date.now()
      });
    });

  }, 3000);
}

/**
 * Get monitoring statistics
 */
function getMonitoringStats() {
  return {
    active: activeMonitorCount,
    queued: pendingChannels.length,
    total: runningChannels.size,
    maxConcurrent: MAX_CONCURRENT_MONITORS
  };
}

/**
 * Stop all monitors (for graceful shutdown)
 */
function stopAllMonitors() {
  console.log("🛑 Stopping all monitors...");
  for (const [id, data] of runningChannels.entries()) {
    try {
      data.monitor.stop();
    } catch (err) {
      console.error(`Error stopping monitor ${id}:`, err.message);
    }
  }
  runningChannels.clear();
  pendingChannels.length = 0;
  activeMonitorCount = 0;
}

export {
  emitter,
  startHLSMonitor,
  refreshChannels,
  getMonitoringStats,
  stopAllMonitors
};
