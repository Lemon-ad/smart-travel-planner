import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  registerUser
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

export const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", authenticateToken, getCurrentUser);
authRouter.patch("/password", authenticateToken, changePassword);
