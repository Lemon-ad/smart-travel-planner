import { Trip } from "../models/Trip.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateTripInput } from "../middleware/validateRequest.js";
import { buildPackingSuggestion, getWeatherForDestination } from "../services/weatherService.js";
import { getNearbyAttractions } from "../services/placesService.js";
import { generateAiTripInsights } from "../services/geminiService.js";

function normalizeTripPayload(body) {
  return {
    title: body.title,
    destination: {
      state: body.destinationState || "",
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

function buildDailyBreakdown(trip, weather) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const totalDays =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const interests = trip.preferences.interests.length > 0 ? trip.preferences.interests : ["local highlights"];

  return Array.from({ length: totalDays }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);
    const activityFocus = interests[index % interests.length];
    const weatherTip =
      weather.temperature >= 30
        ? "Keep outdoor plans earlier in the day."
        : "Current weather is suitable for daytime exploring.";

    return {
      day: index + 1,
      date: currentDate.toISOString().slice(0, 10),
      focus: activityFocus,
      note:
        index === 0
          ? `Arrival day: settle in and explore nearby ${activityFocus}.`
          : `Plan ${activityFocus} activities and keep flexibility for local discoveries.`,
      weatherTip
    };
  });
}

export const createTrip = asyncHandler(async (req, res) => {
  const validatedTrip = validateTripInput(req.body);

  const trip = await Trip.create({
    ...normalizeTripPayload({
      ...req.body,
      ...validatedTrip
    }),
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
  const validatedTrip = validateTripInput(req.body);

  const trip = await findUserTrip(req.params.id, req.user._id);
  Object.assign(
    trip,
    normalizeTripPayload({
      ...req.body,
      ...validatedTrip
    })
  );
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
  const dailyBreakdown = buildDailyBreakdown(trip, weather);
  let aiInsights = null;

  try {
    aiInsights = await generateAiTripInsights({
      trip,
      weather,
      attractions,
      packingList
    });
  } catch (_error) {
    aiInsights = null;
  }

  res.json({
    trip,
    weather,
    attractions,
    packingList,
    dailyBreakdown,
    aiInsights,
    summary: {
      tripDuration,
      smartVisitAdvice:
        weather.temperature > 32
          ? "Plan outdoor activities for the early morning or evening."
          : weather.temperature < 18
            ? "Pack a light layer and prioritise indoor breaks if needed."
            : "Current weather looks suitable for a comfortable visit."
    }
  });
});
