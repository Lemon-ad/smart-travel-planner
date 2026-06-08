import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sanitizeUser } from "../utils/serializers.js";
import { validateDisplayName, validateEmail } from "../middleware/validateRequest.js";
import { getAdminTrips } from "./tripController.js";

export { getAdminTrips };

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (req.body.name !== undefined) {
    user.name = validateDisplayName(req.body.name);
  }

  if (req.body.email !== undefined) {
    const normalizedEmail = validateEmail(req.body.email);
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    user.email = normalizedEmail;
  }

  await user.save();

  res.json({
    message: "Profile updated successfully",
    user: sanitizeUser(user)
  });
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({}).select("-password").sort({ createdAt: -1 });

  res.json({
    users: users.map(sanitizeUser)
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    throw new AppError("Role must be either user or admin", 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.role = role;
  await user.save();

  res.json({
    message: "User role updated successfully",
    user: sanitizeUser(user)
  });
});
