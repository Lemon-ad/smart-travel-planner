import { Router } from "express";
import {
  createTrip,
  deleteTrip,
  getTripAttractions,
  getTripById,
  getTripOverview,
  getTripPackingList,
  getTrips,
  getTripWeather,
  updateTrip
} from "../controllers/tripController.js";
import { authenticateToken, validateMongoId } from "../middleware/authMiddleware.js";

export const tripRouter = Router();

tripRouter.use(authenticateToken);
tripRouter.post("/", createTrip);
tripRouter.get("/", getTrips);
tripRouter.use("/:id", validateMongoId());
tripRouter.get("/:id", getTripById);
tripRouter.put("/:id", updateTrip);
tripRouter.delete("/:id", deleteTrip);
tripRouter.get("/:id/weather", getTripWeather);
tripRouter.get("/:id/attractions", getTripAttractions);
tripRouter.get("/:id/packing-list", getTripPackingList);
tripRouter.get("/:id/overview", getTripOverview);
