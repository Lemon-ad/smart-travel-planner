import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/jwt.js";
import { sanitizeUser } from "../utils/serializers.js";
import { validateRequiredFields } from "../middleware/validateRequest.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  validateRequiredFields(["name", "email", "password"], req.body);

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
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

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

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
