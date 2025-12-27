import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { UploadEPGFile, AllEpgFiles, DeleteEpgFiles } from '../controllers/epgController.js';
import { uploadEPG } from '../config/multer.js';

const epgRoutes = express.Router();

epgRoutes.post('/create', protect, uploadEPG, UploadEPGFile);

epgRoutes.get('/all', protect, AllEpgFiles);

epgRoutes.delete('/delete/:id', protect, DeleteEpgFiles);

export default epgRoutes;