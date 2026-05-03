import { Trip } from "../models/Trip.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateRequiredFields } from "../middleware/validateRequest.js";
import { buildPackingSuggestion, getWeatherForDestination } from "../services/weatherService.js";
import { getNearbyAttractions } from "../services/placesService.js";

function normalizeTripPayload(body) {
  return {
    title: body.title,
    destination: {
      city: body.destinationCity,
      country: body.destinationCountry
    },
    notes: body.notes || "",
    category: body.category || "Other",
    preferences: {
      weather: body.preferredWeather || "",
      dietary: body.dietaryPreference || "",
      interests: Array.isArray(body.interests)
        ? body.interests
        : String(body.interests || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    },
    startDate: body.startDate,
    endDate: body.endDate,
    budget: Number(body.budget || 0)
  };
}

async function findUserTrip(tripId, userId) {
  const trip = await Trip.findOne({ _id: tripId, user: userId });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  return trip;
}

export const createTrip = asyncHandler(async (req, res) => {
  validateRequiredFields(
    ["title", "destinationCity", "destinationCountry", "startDate", "endDate"],
    req.body
  );

  const trip = await Trip.create({
    ...normalizeTripPayload(req.body),
    user: req.user._id
  });

  res.status(201).json({
    message: "Trip created successfully",
    trip
  });
});

export const getTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.json({ trips });
});

export const getTripById = asyncHandler(async (req, res) => {
  const trip = await findUserTrip(req.params.id, req.user._id);
  res.json({ trip });
});

export const updateTrip = asyncHandler(async (req, res) => {
  validateRequiredFields(
    ["title", "destinationCity", "destinationCountry", "startDate", "endDate"],
    req.body
  );

  const trip = await findUserTrip(req.params.id, req.user._id);
  Object.assign(trip, normalizeTripPayload(req.body));
  await trip.save();

  res.json({
    message: "Trip updated successfully",
    trip
  });
});

export const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await findUserTrip(req.params.id, req.user._id);
  await trip.deleteOne();

  res.json({
    message: "Trip deleted successfully"
  });
});

export const getTripWeather = asyncHandler(async (req, res) => {
  const trip = await findUserTrip(req.params.id, req.user._id);
  const weather = await getWeatherForDestination(trip.destination.city, trip.destination.country);

  res.json({ weather });
});

export const getTripAttractions = asyncHandler(async (req, res) => {
  const trip = await findUserTrip(req.params.id, req.user._id);
  const attractions = await getNearbyAttractions(
    `${trip.destination.city}, ${trip.destination.country}`,
    trip.preferences.interests
  );

  res.json({ attractions });
});

export const getTripPackingList = asyncHandler(async (req, res) => {
  const trip = await findUserTrip(req.params.id, req.user._id);
  const weather = await getWeatherForDestination(trip.destination.city, trip.destination.country);
  const packingList = buildPackingSuggestion(weather);

  res.json({
    weather,
    packingList
  });
});

export const getTripOverview = asyncHandler(async (req, res) => {
  const trip = await findUserTrip(req.params.id, req.user._id);
  const weather = await getWeatherForDestination(trip.destination.city, trip.destination.country);
  const attractions = await getNearbyAttractions(
    `${trip.destination.city}, ${trip.destination.country}`,
    trip.preferences.interests
  );
  const packingList = buildPackingSuggestion(weather);
  const tripDuration =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  res.json({
    trip,
    weather,
    attractions,
    packingList,
    summary: {
      tripDuration,
      smartVisitAdvice:
        weather.temperature > 32
          ? "Plan outdoor activities for the early morning or evening."
          : "Current weather looks suitable for a comfortable visit."
    }
  });
});
