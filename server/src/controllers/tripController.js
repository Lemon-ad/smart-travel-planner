import mongoose from "mongoose";
import { Trip } from "../models/Trip.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateEmail, validateTripInput } from "../middleware/validateRequest.js";
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

function getCollaborationEntry(trip, userId) {
  return (trip.sharedWith || []).find((entry) => String(entry.user) === String(userId));
}

function decorateTripForUser(trip, user) {
  const plainTrip = trip.toObject ? trip.toObject() : trip;
  const isAdmin = user.role === "admin";
  const isOwner = String(plainTrip.user) === String(user._id);
  const collaborationEntry = getCollaborationEntry(plainTrip, user._id);
  const canEdit = isAdmin || isOwner || collaborationEntry?.permission === "edit";
  const canDelete = isAdmin || isOwner;

  return {
    ...plainTrip,
    access: {
      isOwner,
      isAdmin,
      isCollaborator: Boolean(collaborationEntry),
      collaborationPermission: collaborationEntry?.permission || null,
      canEdit,
      canDelete
    }
  };
}

function buildAccessibleTripQuery(user) {
  if (user.role === "admin") {
    return {};
  }

  return {
    $or: [{ user: user._id }, { "sharedWith.user": user._id }]
  };
}

async function findAccessibleTrip(tripId, user, options = {}) {
  const { requireEdit = false, requireOwner = false } = options;
  const baseQuery = user.role === "admin" ? { _id: tripId } : { _id: tripId, ...buildAccessibleTripQuery(user) };
  const trip = await Trip.findOne(baseQuery);

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  const isOwner = String(trip.user) === String(user._id);
  const collaborationEntry = getCollaborationEntry(trip, user._id);
  const canEdit = user.role === "admin" || isOwner || collaborationEntry?.permission === "edit";

  if (requireOwner && !(user.role === "admin" || isOwner)) {
    throw new AppError("Only the owner or an admin can manage trip sharing", 403);
  }

  if (requireEdit && !canEdit) {
    throw new AppError("You do not have permission to edit this shared trip", 403);
  }

  return trip;
}

function buildDailyBreakdown(trip, weather) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const totalDays =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const interests = trip.preferences.interests.length > 0 ? trip.preferences.interests : ["local highlights"];
  const weatherPreference = String(trip.preferences.weather || "").toLowerCase();
  const weatherDescription = String(weather?.description || "").toLowerCase();

  return Array.from({ length: totalDays }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);
    const focus = interests[index % interests.length];
    const isArrival = index === 0;
    const isFinalDay = index === totalDays - 1;
    const weatherTip =
      weatherPreference && weatherDescription
        ? `You asked for ${weatherPreference} conditions. Current weather is ${weatherDescription}.`
        : typeof weather?.temperature === "number"
          ? weather.temperature >= 30
            ? "Warm conditions: keep outdoor plans earlier in the day."
            : weather.temperature <= 18
              ? "Cooler conditions: keep a light layer ready for evenings."
              : "Current weather is suitable for daytime exploring."
          : "Check the latest forecast before locking in outdoor activities.";

    const baseNote = isArrival
      ? `Arrival day: settle in and explore a ${focus}-friendly area near your stay.`
      : isFinalDay
        ? `Keep this day flexible for favourite ${focus} spots, souvenir stops, and a smooth departure.`
        : `Mix ${focus} plans with one indoor fallback and one local food stop to keep the day balanced.`;

    return {
      day: index + 1,
      date: currentDate.toISOString().slice(0, 10),
      focus,
      note: baseNote,
      weatherTip
    };
  });
}

function monthNameFromDate(dateString) {
  return new Date(dateString).toLocaleString("en-US", { month: "long" });
}

function buildPreferenceMatch(trip, weather) {
  const preferredWeather = String(trip.preferences.weather || "").toLowerCase();
  const startMonth = new Date(trip.startDate).getMonth();
  const tripMonthName = monthNameFromDate(trip.startDate);

  if (!preferredWeather) {
    return "";
  }

  if (preferredWeather.includes("winter")) {
    const winterMonths = [11, 0, 1];
    return winterMonths.includes(startMonth)
      ? `Your selected dates fall in ${tripMonthName}, which is much closer to your winter-style preference.`
      : `You prefer winter-like weather, but ${tripMonthName} may feel warmer than ideal. A later-year trip window could suit you better.`;
  }

  if (preferredWeather.includes("sunny")) {
    return weather?.description?.toLowerCase().includes("rain")
      ? "You prefer sunny weather, but current conditions are wet. Consider shifting outdoor activities to drier seasons if possible."
      : "You prefer sunny weather, and the current conditions look reasonably aligned for outdoor exploring.";
  }

  if (preferredWeather.includes("rain")) {
    return weather?.description?.toLowerCase().includes("rain")
      ? "You prefer rainy or moodier weather, and the current conditions fit that style well."
      : `You prefer rainy weather, but ${tripMonthName} currently looks drier than expected.`;
  }

  if (preferredWeather.includes("cool")) {
    return typeof weather?.temperature === "number" && weather.temperature <= 22
      ? "You prefer cooler weather, and the current conditions are reasonably aligned."
      : "You prefer cooler weather, but the current conditions may feel warmer than ideal.";
  }

  return `Your saved weather preference is ${trip.preferences.weather}. Use the current weather card to compare how closely the selected dates align.`;
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
    trip: decorateTripForUser(trip, req.user)
  });
});

export const getTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find(buildAccessibleTripQuery(req.user)).sort({ createdAt: -1 });

  res.json({
    trips: trips.map((trip) => decorateTripForUser(trip, req.user))
  });
});

export const getTripById = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user);
  res.json({ trip: decorateTripForUser(trip, req.user) });
});

export const updateTrip = asyncHandler(async (req, res) => {
  const validatedTrip = validateTripInput(req.body);
  const trip = await findAccessibleTrip(req.params.id, req.user, { requireEdit: true });

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
    trip: decorateTripForUser(trip, req.user)
  });
});

export const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user, { requireOwner: true });
  await trip.deleteOne();

  res.json({
    message: "Trip deleted successfully"
  });
});

export const shareTripWithUser = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user, { requireOwner: true });
  const normalizedEmail = validateEmail(req.body.email);
  const permission = req.body.permission === "view" ? "view" : "edit";
  const collaborator = await User.findOne({ email: normalizedEmail }).select("-password");

  if (!collaborator) {
    throw new AppError("No user account found with that email", 404);
  }

  if (String(collaborator._id) === String(trip.user)) {
    throw new AppError("You already own this trip", 400);
  }

  const existingIndex = trip.sharedWith.findIndex(
    (entry) => String(entry.user) === String(collaborator._id)
  );

  if (existingIndex >= 0) {
    trip.sharedWith[existingIndex].permission = permission;
    trip.sharedWith[existingIndex].email = collaborator.email;
  } else {
    trip.sharedWith.push({
      user: collaborator._id,
      email: collaborator.email,
      permission
    });
  }

  await trip.save();

  res.json({
    message: "Collaborator access updated successfully",
    trip: decorateTripForUser(trip, req.user)
  });
});

export const removeTripCollaborator = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user, { requireOwner: true });
  const collaboratorId = req.params.userId;

  trip.sharedWith = trip.sharedWith.filter((entry) => String(entry.user) !== collaboratorId);
  await trip.save();

  res.json({
    message: "Collaborator removed successfully",
    trip: decorateTripForUser(trip, req.user)
  });
});

export const getTripWeather = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user);
  const weather = await getWeatherForDestination(trip.destination.city, trip.destination.country);

  res.json({ weather });
});

export const getTripAttractions = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user);
  const attractions = await getNearbyAttractions(
    `${trip.destination.city}, ${trip.destination.country}`,
    trip.preferences.interests,
    trip.preferences.dietary
  );

  res.json({ attractions });
});

export const getTripPackingList = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user);
  const weather = await getWeatherForDestination(trip.destination.city, trip.destination.country);
  const packingList = buildPackingSuggestion(weather);

  res.json({
    weather,
    packingList
  });
});

export const getTripOverview = asyncHandler(async (req, res) => {
  const trip = await findAccessibleTrip(req.params.id, req.user);
  let weather = null;
  let attractions = [];
  let packingList = [];
  const warnings = [];

  try {
    weather = await getWeatherForDestination(trip.destination.city, trip.destination.country);
    packingList = buildPackingSuggestion(weather);
  } catch (error) {
    warnings.push(error.message || "Weather data is currently unavailable");
  }

  try {
    attractions = await getNearbyAttractions(
      `${trip.destination.city}, ${trip.destination.country}`,
      trip.preferences.interests,
      trip.preferences.dietary
    );
  } catch (error) {
    warnings.push("Nearby attractions are currently unavailable");
  }

  const tripDuration =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  let dailyBreakdown = buildDailyBreakdown(trip, weather);
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

  const finalPackingList =
    aiInsights?.packingList?.length > 0 ? aiInsights.packingList : packingList;

  const finalAttractions =
    attractions.length > 0
      ? attractions
      : (aiInsights?.attractionIdeas || []).map((idea, index) => ({
          id: `ai-${index + 1}`,
          name: idea.name || "Suggested place",
          category: idea.category || "Local recommendation",
          address: idea.reason || "Suggested by Gemini based on your trip preferences.",
          openNow: null,
          source: "gemini"
        }));

  if (aiInsights?.dailyBreakdown?.length > 0) {
    const startDate = new Date(trip.startDate);
    dailyBreakdown = aiInsights.dailyBreakdown.map((day, index) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + index);

      return {
        day: Number(day.day) || index + 1,
        date: currentDate.toISOString().slice(0, 10),
        focus: day.focus || "Flexible exploration",
        note: [day.morning, day.afternoon, day.evening].filter(Boolean).join(" "),
        weatherTip: [day.foodNote, day.weatherNote].filter(Boolean).join(" ")
      };
    });
  }

  res.json({
    trip: decorateTripForUser(trip, req.user),
    weather,
    attractions: finalAttractions,
    packingList: finalPackingList,
    dailyBreakdown,
    aiInsights,
    warnings,
    summary: {
      tripDuration,
      preferenceMatch:
        aiInsights?.preferenceMatch || buildPreferenceMatch(trip, weather),
      smartVisitAdvice:
        aiInsights?.timingTip ||
        buildPreferenceMatch(trip, weather) ||
        (weather
          ? weather.temperature > 32
            ? "Plan outdoor activities for the early morning or evening."
            : weather.temperature < 18
              ? "Pack a light layer and prioritise indoor breaks if needed."
              : "Current weather looks suitable for a comfortable visit."
          : "Weather or attractions data is temporarily unavailable, but your trip plan is still saved.")
    }
  });
});

export const getAdminTrips = asyncHandler(async (_req, res) => {
  const trips = await Trip.find({}).sort({ createdAt: -1 });

  res.json({
    trips
  });
});
