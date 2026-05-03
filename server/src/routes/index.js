import { Router } from "express";
import { authRouter } from "./authRoutes.js";
import { tripRouter } from "./tripRoutes.js";

export const router = Router();

router.use("/auth", authRouter);
router.use("/trips", tripRouter);
