import jwt from "jsonwebtoken";
import { AppError } from "./AppError.js";

export function generateToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }

  return jwt.sign(
    {
      sub: user._id,
      email: user.email,
      role: user.role
    },
    secret,
    { expiresIn: "7d" }
  );
}
