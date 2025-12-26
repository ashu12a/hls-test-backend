import fs from "fs";
import path from "path";
import Channel from "../models/channelModel.js";
import { refreshChannels } from "../utils/hls/hlsMonitorManager.js";
import { clearLogStateCache } from "../socket/index.js";

export const createChannel = async (req, res, next) => {
  try {
    const data = await Channel.create(req.body);

    if (data && data.url) {
      await refreshChannels();
    }

    res.status(201).json({ success: true, data: data });
  } catch (err) {
    next(err);
  }
};

export const getChannels = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    const limit = parseInt(req.query.limit) || 10; // Default to 10 blogs per page
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    const userId = req?.user?._id;
    const filter = req?.user?.role !== "admin" ? { author: userId } : {};

    // Retrieve blogs with pagination and exclude content
    const ChannelUrls = await Channel.find(filter).sort({ createdAt: -1 }).populate('author')
      .skip(skip)
      .limit(limit);

    // Count total documents for pagination metadata
    const total = await Channel.countDocuments();

    res.status(200).json({
      success: true,
      data: ChannelUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOneChannel = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Retrieve blogs with pagination and exclude content
    const ChannelUrls = await Channel.findById(id).populate('author');

    res.status(200).json({
      success: true,
      data: ChannelUrls,
    });
  } catch (err) {
    next(err);
  }
};

export const updateChannel = async (req, res, next) => {
  try {
    const id = req.params.id;

    const channel = await Channel.findByIdAndUpdate(
      id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    await refreshChannels();

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }


    res.status(200).json({
      success: true,
      message: "RTML Url updated successfully",
    });

  } catch (err) {
    next(err);
  }
};

export const deletChannel = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Channel.findByIdAndDelete(id);

    // refresh channel monitors
    if (data && data.url) {
      await refreshChannels();
    }

    // delete log file if exists
    const logFilePath = path.join(
      process.cwd(),
      "public",
      "logs",
      `monitor-${id}.log`
    );

    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
      console.log(`🗑️ Log deleted: monitor-${id}.log`);
    }

    // Clear log state cache
    clearLogStateCache(id);

    res.status(200).json({
      success: true,
      message: "Channel Deleted",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
