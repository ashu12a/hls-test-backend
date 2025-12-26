import express from "express";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import { createChannel, deletChannel, getChannels, updateChannel, getOneChannel } from "../controllers/channelController.js";


const channelRoutes = express.Router();

channelRoutes.get('/', protect, getChannels);

channelRoutes.get('/one/:id', getOneChannel);

channelRoutes.post('/create', protect, authorize("admin"),  createChannel);

channelRoutes.put('/update/:id', protect, authorize("admin"),  updateChannel);

channelRoutes.delete("/delete/:id", protect, authorize("admin"),  deletChannel);

export default channelRoutes;
