import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/jwt.js";
import { sanitizeUser } from "../utils/serializers.js";
import {
  validateDisplayName,
  validateEmail,
  validateRequiredFields
} from "../middleware/validateRequest.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  validateRequiredFields(["name", "email", "password"], req.body);
  const normalizedName = validateDisplayName(name);
  const normalizedEmail = validateEmail(email);
  const normalizedPassword = validatePassword(password);

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(normalizedPassword, 12);
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashedPassword
  });
  const token = generateToken(user);

  res.status(201).json({
    message: "User registered successfully",
    token,
    user: sanitizeUser(user)
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  validateRequiredFields(["email", "password"], req.body);
  const normalizedEmail = validateEmail(email);
  const normalizedPassword = String(password || "");

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(normalizedPassword, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken(user);

  res.json({
    message: "Login successful",
    token,
    user: sanitizeUser(user)
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    user: req.user
  });
});
