import { Router } from "express";
import { authenticateToken, authorizeRole, validateMongoId } from "../middleware/authMiddleware.js";
import { getAdminTrips, getUsers, updateProfile, updateUserRole } from "../controllers/userController.js";

export const userRouter = Router();

userRouter.use(authenticateToken);
userRouter.patch("/profile", updateProfile);
userRouter.get("/", authorizeRole("admin"), getUsers);
userRouter.get("/admin/trips", authorizeRole("admin"), getAdminTrips);
userRouter.patch("/:id/role", authorizeRole("admin"), validateMongoId(), updateUserRole);
