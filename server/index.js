import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import { Server } from "socket.io";

// Env Configuration
dotenv.config();


// importing modules
import errorHandler from "./middlewares/errorHandler.js";
import connectDB from "./config/db.js";

// importing routes
import userRoutes from "./routes/userRoutes.js";
import epgRoutes from "./routes/epgRouter.js";
import channelRoutes from "./routes/channelRoutes.js";
import checkEPGFiles from "./controllers/checkEPGFiles.js";
import { connectAgenda } from "./config/agenda.js";
import socketConnection from "./socket/index.js";
import { startHLSMonitor, stopAllMonitors } from "./utils/hls/hlsMonitorManager.js";
import { sendMail } from "./config/mail/mailer.js";
import { freezeAlertTemplate } from "./config/mail/templates.js";
import infoRoutes from "./routes/infoRoutes.js";
import mongoose from "mongoose";
import { startLogCleanup } from "./utils/logCleanup.js";


// Create an instance of express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3050;

// Initialize Socket.IO with compression and optimizations
const io = new Server(server, {
  cors: {
    origin: "http://94.136.185.222:5173", // or restrict to your frontend URL
    methods: ["GET", "POST"],
  },
  // Enable compression for better performance
  compression: true,
  // Optimize for large payloads
  maxHttpBufferSize: 1e8, // 100MB
  // Ping timeout and interval
  pingTimeout: 60000,
  pingInterval: 25000,
  // Enable HTTP long-polling as fallback
  transports: ['websocket', 'polling'],
});

// Call socket connection handler
socketConnection(io);

// Global shutdown flag
let isShuttingDown = false;

// connect monogodb and initialize services
(async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Wait for MongoDB connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          mongoose.connection.once('connected', resolve);
        }
      });
    }

    // Connect Agenda
    await connectAgenda();

    // Start HLS monitoring after DB is connected
    await startHLSMonitor();

    // Start automatic log cleanup (keeps only 7 days of logs)
    startLogCleanup();

    // Start server after everything is initialized
    server.listen(PORT, () => {
      console.log(`Server is Started at Port : ${PORT}`);
    });
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
})();

// Apply middleware for CORS and bodyParser
app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Serving static files from the public directory
app.use("/public", express.static("public/"));

// Import all routes
app.use(`/api/v1/user`, userRoutes);
app.use(`/api/v1/epg`, epgRoutes);
app.use(`/api/v1/channel`, channelRoutes);
app.use(`/api/v1/info`, infoRoutes);

// app.use('/api/test', checkEPGFiles)

// Error Handling middleware
app.use(errorHandler);

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log("Shutdown already in progress...");
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log("HTTP server closed");
    
    // Stop all stream monitors
    stopAllMonitors();
    console.log("All monitors stopped");
    
    // Close database connections
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
      }
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
    }
    
    // Close Agenda
    try {
      const { agenda } = await import("./config/agenda.js");
      if (agenda) {
        await agenda.stop();
        console.log("Agenda stopped");
      }
    } catch (err) {
      console.error("Error stopping Agenda:", err);
    }
    
    console.log("Graceful shutdown complete");
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  // During shutdown, ignore MongoDB connection errors
  if (isShuttingDown && reason?.message?.includes("Client must be connected")) {
    console.log("Ignoring MongoDB error during shutdown");
    return;
  }
  
  console.error("Unhandled Rejection:", reason);
  
  // If it's a critical error and not during shutdown, trigger shutdown
  if (!isShuttingDown && reason?.name === "MongoNotConnectedError") {
    console.error("Critical MongoDB error detected, initiating shutdown...");
    gracefulShutdown("unhandledRejection");
  }
});




