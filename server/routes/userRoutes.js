import express from "express";
import {
  register,
  login,
  getCurrentUser,
  getUsersList,
  deleteUser,
  updateUser,
} from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.post("/login", login);

userRoutes.get("/me", protect, getCurrentUser);

userRoutes.post("/register",protect, authorize("admin"), register);

userRoutes.put("/update/:id",protect, authorize("admin"), updateUser);

userRoutes.get("/user-list", protect, authorize("admin"), getUsersList);

userRoutes.delete("/:id", protect, authorize("admin"), deleteUser);

export default userRoutes;