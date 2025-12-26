import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getAllChannelCategories, getAllLanguages, healthCheck, getMonitoringStats, cleanupLogs } from '../controllers/infoController.js';

const infoRoutes = express.Router();

// Public health check endpoint
infoRoutes.get('/health', healthCheck);

infoRoutes.get('/languages', protect, getAllLanguages);

infoRoutes.get('/channel-categories', protect, getAllChannelCategories);

// Admin-only monitoring endpoint
infoRoutes.get('/monitoring', protect, getMonitoringStats);

// Manual log cleanup endpoint (admin only)
infoRoutes.post('/logs/cleanup', protect, cleanupLogs);

export default infoRoutes;