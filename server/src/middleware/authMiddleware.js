import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticateToken = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }

  const payload = jwt.verify(token, secret);
  const user = await User.findById(payload.sub).select("-password");

  if (!user) {
    throw new AppError("User not found", 401);
  }

  req.user = user;
  next();
});

export function authorizeRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      next(new AppError("Forbidden", 403));
      return;
    }

    next();
  };
}
