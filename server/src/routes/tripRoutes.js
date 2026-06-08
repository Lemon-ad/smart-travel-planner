import { Router } from "express";
import {
  createTrip,
  deleteTrip,
  getTripAttractions,
  getTripById,
  getAdminTrips,
  getTripOverview,
  getTripPackingList,
  getTrips,
  getTripWeather,
  removeTripCollaborator,
  shareTripWithUser,
  updateTrip
} from "../controllers/tripController.js";
import { authenticateToken, authorizeRole, validateMongoId } from "../middleware/authMiddleware.js";

export const tripRouter = Router();

tripRouter.use(authenticateToken);
tripRouter.post("/", createTrip);
tripRouter.get("/", getTrips);
tripRouter.get("/admin/all", authorizeRole("admin"), getAdminTrips);
tripRouter.use("/:id", validateMongoId());
tripRouter.get("/:id", getTripById);
tripRouter.put("/:id", updateTrip);
tripRouter.delete("/:id", deleteTrip);
tripRouter.post("/:id/share", shareTripWithUser);
tripRouter.delete("/:id/share/:userId", validateMongoId("userId"), removeTripCollaborator);
tripRouter.get("/:id/weather", getTripWeather);
tripRouter.get("/:id/attractions", getTripAttractions);
tripRouter.get("/:id/packing-list", getTripPackingList);
tripRouter.get("/:id/overview", getTripOverview);
