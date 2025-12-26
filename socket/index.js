import fs from "fs/promises";
import path from "path";
import { emitter } from "../utils/hls/hlsMonitorManager.js";
import { decodeJwtToken } from "../utils/Other.js";

const logIntervals = new Map();

// Cache for log states to avoid reading files repeatedly
const logStateCache = new Map();
const CACHE_TTL = 2000; // 2 seconds cache TTL
const MAX_LOG_LINES = 20; // Maximum lines to read from log file

export default function socketConnection(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // join room 
    socket.on("join_room", async ({ token }) => {

      const user = await decodeJwtToken(token);

      if (!user) {
        console.log("❌ Unauthorized socket connection attempt");
        socket.disconnect();
        return;
      }

      const room = `user:${user?._id}`;

      // Admin joins a special room
      if (user && user?.role === "admin") {
        socket.join("admin");
        console.log("👑 Admin joined");
        return;
      }

      // Regular user joins channel room
      socket.join(room);

    });

    // leave room
    socket.on("leave_room", async ({ token }) => {
      const user = await decodeJwtToken(token);

      if (!user) {
        console.log("❌ Unauthorized socket connection attempt");
        socket.disconnect();
        return;
      }

      const room = `user:${user?._id}`;
      socket.leave(room);
      console.log(`🚪 Left channel room: ${user?._id}`);
    });

    // join logs room 
    socket.on("join_logs", async ({ id }) => {
      const room = `logs:${id}`;
      socket.join(room);

      const logPath = path.join(
        process.cwd(),
        "public",
        "logs",
        `monitor-${id}.log`
      );

      // Clear existing interval if re-joining
      if (logIntervals.has(socket.id)) {
        clearInterval(logIntervals.get(socket.id));
      }

      // send last 10 lines immediately upon joining
      // const lastLogs = readLastLines(logPath, 10);

      // socket.emit("live_logs", {
      //   channelId: id,
      //   logs: lastLogs,
      //   timestamp: Date.now(),
      // });

      // Send logs every 3 seconds (async)
      const interval = setInterval(async () => {
        try {
          const lastLogs = await getLastStates(id);

          socket.emit("live_logs", {
            channelId: id,
            data: lastLogs,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error(`Error getting log states for channel ${id}:`, err.message);
        }
      }, 3000);

      logIntervals.set(socket.id, interval);

    });

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      if (logIntervals.has(socket.id)) {
        clearInterval(logIntervals.get(socket.id));
        logIntervals.delete(socket.id);
      }
      console.log("🔴 Disconnected:", socket.id);
    });

  });

  // for admin - full data
  emitter.on("streams", (data) => {
    io.to("admin").emit("streams", data);
  });

  // for admin - delta updates (more efficient)
  emitter.on("streamsDelta", (delta) => {
    io.to("admin").emit("streamsDelta", delta);
  });

  // for normal users - full data
  emitter.on("userStreams", (data) => {
    if (data && data.length > 0 && data[0].author) {
      const room = `user:${data[0].author._id}`;
      io.to(room).emit("streams", data);
    }
  });

  // for normal users - delta updates (more efficient)
  emitter.on("userStreamsDelta", (delta) => {
    if (delta && delta.authorId) {
      const room = `user:${delta.authorId}`;
      io.to(room).emit("streamsDelta", delta);
    }
  });

}

export { clearLogStateCache };


/**
 * Get last states from log file (with caching)
 */
async function getLastStates(channelId) {
  const cacheKey = channelId;
  const cached = logStateCache.get(cacheKey);
  
  // Return cached result if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const LOG_DIR = path.join(process.cwd(), "public", "logs");
  const file = path.join(LOG_DIR, `monitor-${channelId}.log`);

  try {
    // Check if file exists (async)
    await fs.access(file);
  } catch {
    // File doesn't exist
    const result = null;
    logStateCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  try {
    // Read file asynchronously
    const content = await fs.readFile(file, "utf8");
    const lines = content
      .trim()
      .split("\n")
      .reverse(); // ⬅️ IMPORTANT

    let result = {
      freeze: null, // START | END
      dark: null,   // START | END
      status: null,  // ONLINE | OFFLINE | UNSTABLE
      logs: lines?.slice(0, MAX_LOG_LINES),
    };

    for (const line of lines) {
      // FREEZE
      if (!result.freeze) {
        if (line.includes("FREEZE START")) result.freeze = "START";
        else if (line.includes("FREEZE END")) result.freeze = "END";
      }

      // DARK
      if (!result.dark) {
        if (line.includes("DARK SCREEN (")) result.dark = "START";
        else if (line.includes("DARK SCREEN END")) result.dark = "END";
      }

      // STATUS
      if (!result.status) {
        if (line.includes("STATUS → ONLINE")) result.status = "ONLINE";
        else if (line.includes("STATUS → OFFLINE")) result.status = "OFFLINE";
        else if (line.includes("STATUS → UNSTABLE")) result.status = "UNSTABLE";
      }

      // stop early if all found
      if (result.freeze && result.dark && result.status) break;
    }

    // Cache the result
    logStateCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error(`Error reading log file for channel ${channelId}:`, err.message);
    return null;
  }
}

/**
 * Clear log state cache (useful for cleanup)
 */
function clearLogStateCache(channelId) {
  if (channelId) {
    logStateCache.delete(channelId);
  } else {
    logStateCache.clear();
  }
}