import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// Register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, epg, hls } = req.body;
    const user = await User.create({ name, email, password, role, epg, hls });
    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password" });
    }
    const token = generateToken(user);
    res.status(200).json({ success: true, message: "Login successful", token });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getUsersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    const limit = parseInt(req.query.limit) || 10; // Default to 10 blogs per page
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    // Retrieve blogs with pagination and exclude content
    const users = await User.find().select('-password').skip(skip).limit(limit);

    // Count total documents for pagination metadata
    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const id = req.params.id
    const user = await User.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "User Deleted",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, email, role, password, epg, hls } = req.body;

    // Basic validation
    if (!name || !email) {
      return next(new Error("Name and Email are required."));
    }

    // Find existing user
    const user = await User.findById(id);
    if (!user) return next(new Error("User not found."));

    // Check duplicate email (exclude current user)
    const emailExists = await User.findOne({ email, _id: { $ne: id } });
    if (emailExists) {
      return next(new Error("Email already in use by another user."));
    }

    // Update fields
    user.name = name;
    user.email = email;
    user.role = role;
    user.epg = epg;
    user.hls = hls;

    // Update password only if provided
    if (password && password.trim() !== "") {
      user.password = password; // pre-save hook will hash it
    }

    await user.save(); // triggers pre-save hook

    res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (err) {
    next(err);
  }
};