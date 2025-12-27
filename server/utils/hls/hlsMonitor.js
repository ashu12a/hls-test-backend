import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { spawn } from "child_process";

export default function createHLSMonitor(config) {
  const {
    streamUrl,
    logDir = path.join(process.cwd(), "public", "logs"),
    channelId,
    channel,
    emitter,
    FREEZE_DURATION = 0.1,
    DARK_LUMA_THRESHOLD = 25,
    DARK_DURATION = 1,
    ALERT_DELAY = 20,
    OFFLINE_TIMEOUT = 5,
    RESTART_DELAY = 3000,
    MAX_LOG_SIZE = 10 * 1024 * 1024, // 10MB default
    MAX_LOG_FILES = 5, // Keep 5 rotated files
  } = config;

  /* ===========================
     LOGGING
  ============================ */

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const logPath = () =>
    path.join(logDir, `monitor-${channelId}.log`);

  let buffer = "";
  let flushTimer = null;
  let currentLogSize = 0;

  // Initialize log size
  (async () => {
    try {
      const stats = await fsPromises.stat(logPath()).catch(() => null);
      currentLogSize = stats?.size || 0;
    } catch (err) {
      currentLogSize = 0;
    }
  })();

  /**
   * Rotate log file if it exceeds max size
   */
  async function rotateLogIfNeeded() {
    if (currentLogSize < MAX_LOG_SIZE) {
      return;
    }

    try {
      const mainLog = logPath();
      
      // Rotate existing files
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const oldFile = `${mainLog}.${i}`;
        const newFile = `${mainLog}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          await fsPromises.rename(oldFile, newFile).catch(() => {});
        }
      }

      // Move current log to .1
      if (fs.existsSync(mainLog)) {
        await fsPromises.rename(mainLog, `${mainLog}.1`);
      }

      currentLogSize = 0;
      console.log(`📦 Log rotated for channel ${channelId}`);
    } catch (err) {
      console.error(`Error rotating log for channel ${channelId}:`, err.message);
    }
  }

  function log(msg) {
    buffer += `[${new Date().toISOString()}] ${msg}\n`;

    if (!flushTimer) {
      flushTimer = setTimeout(async () => {
        // Check if rotation is needed before writing
        await rotateLogIfNeeded();
        
        const logFile = logPath();
        const dataToWrite = buffer;
        
        fs.appendFile(logFile, dataToWrite, (err) => {
          if (!err) {
            currentLogSize += Buffer.byteLength(dataToWrite, 'utf8');
          }
        });
        
        buffer = "";
        flushTimer = null;
      }, 500);
    }

    channel?.set("log", msg, { strict: false });
  }

  /* ===========================
     STATE
  ============================ */

  let ffmpeg = null;
  let lastFrameTime = Date.now();
  let status = "OFFLINE";

  const state = {
    freeze: { active: false, start: null, mailSent: false, timer: null },
    dark: { active: false, start: null, mailSent: false, timer: null },
    offline: { mailSent: false, timer: null, emitted: false },
  };

  /* ===========================
     ALERT HELPERS
  ============================ */

  function sendAlert(type) {
    emitter.emit("sendMail", {
      type,
      channel,
      lastTime: new Date().toLocaleString(),
    });
  }

  function startAlertTimer(stateObj, type) {
    if (stateObj.timer) return;

    stateObj.timer = setTimeout(() => {
      stateObj.mailSent = true;
      sendAlert(type);
    }, ALERT_DELAY * 1000);
  }

  function clearAlert(stateObj, recoverType) {
    if (stateObj.mailSent) {
      sendAlert(recoverType);
    }
    clearTimeout(stateObj.timer);
    stateObj.timer = null;
    stateObj.mailSent = false;
  }

  /* ===========================
     STATUS HANDLER
  ============================ */

  function setStatus(newStatus) {
    if (status === newStatus) return;

    if (newStatus === "OFFLINE") {
      if (state.offline.emitted) return;
      state.offline.emitted = true;
      startAlertTimer(state.offline, "OFFLINE");
    }

    if (newStatus === "ONLINE") {
      state.offline.emitted = false;
      clearAlert(state.offline, "SITE_OFFLINE_RECOVERED");
    }

    status = newStatus;
    if (newStatus !== "UNSTABLE") {
      log(`STATUS → ${newStatus}`);
    }
  }

  /* ===========================
     FFMPEG WITH ERROR RECOVERY
  ============================ */

  let restartCount = 0;
  const MAX_RESTART_ATTEMPTS = 5;
  const RESTART_BACKOFF_MULTIPLIER = 1.5;
  let restartDelay = RESTART_DELAY;
  let isStopped = false;

  function startFFmpeg() {
    if (isStopped) return;

    setStatus("UNSTABLE");

    try {
      ffmpeg = spawn("ffmpeg", [
        "-hide_banner",
        "-loglevel", "info",
        "-reconnect", "1",
        "-reconnect_streamed", "1",
        "-reconnect_delay_max", "5",
        "-rw_timeout", "15000000",
        "-i", streamUrl,
        "-vf", `signalstats,metadata=print,freezedetect=d=${FREEZE_DURATION}`,
        "-an",
        "-f", "null",
        "-"
      ], {
        stdio: ['ignore', 'ignore', 'pipe']
      });

      // Reset restart count on successful start
      restartCount = 0;
      restartDelay = RESTART_DELAY;

      ffmpeg.stderr.on("data", d => {
        try {
          handleFFmpeg(d.toString());
        } catch (err) {
          console.error(`Error handling FFmpeg output for ${channelId}:`, err.message);
        }
      });

      ffmpeg.on("error", (err) => {
        if (isStopped) return;
        console.error(`FFmpeg spawn error for ${channelId}:`, err.message);
        handleFFmpegRestart();
      });

      ffmpeg.on("exit", (code, signal) => {
        if (isStopped) return;
        
        if (code !== 0 && code !== null) {
          // log(`⚠️ FFmpeg exited with code ${code}, signal ${signal}`);
        }
        
        handleFFmpegRestart();
      });

    } catch (err) {
      console.error(`Error starting FFmpeg for ${channelId}:`, err.message);
      handleFFmpegRestart();
    }
  }

  function handleFFmpegRestart() {
    if (isStopped) return;

    restartCount++;
    
    if (restartCount > MAX_RESTART_ATTEMPTS) {
      // log(`🚨 Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Waiting longer...`);
      restartCount = 0; // Reset but use longer delay
      restartDelay = RESTART_DELAY * 10; // 30 seconds
    } else {
      // Exponential backoff
      restartDelay = Math.min(
        RESTART_DELAY * Math.pow(RESTART_BACKOFF_MULTIPLIER, restartCount - 1),
        RESTART_DELAY * 10 // Max 30 seconds
      );
    }

    setStatus("OFFLINE");
    // log(`🔄 Restarting FFmpeg in ${restartDelay}ms (attempt ${restartCount})`);
    
    setTimeout(() => {
      if (!isStopped) {
        startFFmpeg();
      }
    }, restartDelay);
  }

  /* ===========================
     FFMPEG PARSER
  ============================ */

  function handleFFmpeg(text) {
    const now = Date.now();

    text.split("\n").forEach(line => {
      if (!line) return;

      // ONLINE
      if (line.includes("frame=") || line.includes("Video:")) {
        lastFrameTime = now;
        setStatus("ONLINE");
      }

      // FREEZE
      if (line.includes("freeze_start") && !state.freeze.start) {
        state.freeze.start = now;
      }

      if (line.includes("freeze_end")) {
        if (state.freeze.active) log("✅ FREEZE END");
        state.freeze.active = false;
        state.freeze.start = null;
        clearAlert(state.freeze, "SITE_FREEZE_RECOVERED");
      }

      if (
        state.freeze.start &&
        !state.freeze.active &&
        now - state.freeze.start >= FREEZE_DURATION * 1000
      ) {
        state.freeze.active = true;
        log("🚨 FREEZE START");
        startAlertTimer(state.freeze, "FREEZE");
      }

      // DARK
      const yavg = line.match(/YAVG=([0-9.]+)/);
      if (!yavg) return;

      const y = parseFloat(yavg[1]);

      if (y < DARK_LUMA_THRESHOLD) {
        if (!state.dark.start) state.dark.start = now;

        if (
          !state.dark.active &&
          (now - state.dark.start) / 1000 >= DARK_DURATION
        ) {
          state.dark.active = true;
          log(`🚨 DARK SCREEN (Y=${y.toFixed(1)})`);
          startAlertTimer(state.dark, "DARK");
        }
      } else {
        if (state.dark.active) log("✅ DARK SCREEN END");
        state.dark.start = null;
        state.dark.active = false;
        clearAlert(state.dark, "SITE_BLACK_RECOVERED");
      }
    });
  }

  /* ===========================
     WATCHDOG
  ============================ */

  const watchdog = setInterval(() => {
    if (Date.now() - lastFrameTime > OFFLINE_TIMEOUT * 1000) {
      setStatus("OFFLINE");
    }
  }, 1000);

  startFFmpeg();

  return {
    stop() {
      isStopped = true;
      clearInterval(watchdog);
      
      if (ffmpeg) {
        try {
          // Try graceful shutdown first
          ffmpeg.kill("SIGTERM");
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (ffmpeg && !ffmpeg.killed) {
              ffmpeg.kill("SIGKILL");
            }
          }, 5000);
        } catch (err) {
          console.error(`Error stopping FFmpeg for ${channelId}:`, err.message);
        }
      }
      
      // Clear flush timer
      if (flushTimer) {
        clearTimeout(flushTimer);
        // Flush remaining buffer
        if (buffer) {
          fs.appendFile(logPath(), buffer, () => {});
          buffer = "";
        }
      }
    },
  };
}
