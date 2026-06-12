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
  const interests =
    trip.preferences.interests.length > 0 ? trip.preferences.interests : ["local highlights"];
  const weatherPreference = String(trip.preferences.weather || "").toLowerCase();
  const weatherDescription = String(weather?.description || "").toLowerCase();
  const dietaryPreference = String(trip.preferences.dietary || "").toLowerCase();
  const category = String(trip.category || "Leisure").toLowerCase();
  const budget = Number(trip.budget || 0);

  const focusPool = Array.from(
    new Set([
      ...interests,
      category.includes("family") ? "family activities" : "",
      category.includes("food") ? "food spots" : "",
      category.includes("adventure") ? "outdoor adventure" : "",
      category.includes("business") ? "business-friendly districts" : "",
      budget >= 2500 ? "premium experiences" : "",
      budget > 0 && budget <= 600 ? "budget-friendly discoveries" : "",
      dietaryPreference ? `${dietaryPreference} dining` : ""
    ].filter(Boolean))
  );

  const indoorMode =
    weatherDescription.includes("rain") ||
    weatherDescription.includes("storm") ||
    (typeof weather?.temperature === "number" && weather.temperature >= 31);

  const weatherTip = (() => {
    if (weatherPreference && weatherDescription) {
      return `You asked for ${weatherPreference} conditions. Current weather is ${weatherDescription}.`;
    }

    if (typeof weather?.temperature === "number") {
      if (weather.temperature >= 31) {
        return "Warm conditions suggest earlier outdoor plans and longer indoor breaks in the afternoon.";
      }

      if (weather.temperature <= 18) {
        return "Cooler conditions make layered outfits and warm meal breaks a good idea.";
      }
    }

    if (weatherDescription.includes("rain")) {
      return "Rain-friendly planning is recommended, so keep one indoor stop and one short outdoor segment each day.";
    }

    return "Current weather is suitable for daytime exploring.";
  })();

  const templates = [
    {
      focusLabel: "arrival rhythm",
      note: (focus) =>
        `Arrival day: check in, settle your essentials, then start with one relaxed ${focus} stop close to your base so the day stays light.`
    },
    {
      focusLabel: "morning exploration",
      note: (focus) =>
        `Use the morning for your main ${focus} activity, keep lunch nearby, and leave the late afternoon open for slower wandering or shopping.`
    },
    {
      focusLabel: "food and neighbourhoods",
      note: (focus) =>
        `Build the day around ${focus}, then pair it with one neighbourhood walk and one comfort-food break to avoid an overpacked schedule.`
    },
    {
      focusLabel: "indoor backup",
      note: (focus) =>
        `Keep a flexible plan with one indoor ${focus} option, one scenic stop, and a simple evening activity that is easy to drop if energy runs low.`
    },
    {
      focusLabel: "signature highlights",
      note: (focus) =>
        `Make this your highlight day by prioritising the strongest ${focus} experience first, then keeping smaller local discoveries for the second half.`
    },
    {
      focusLabel: "slow final stretch",
      note: (focus) =>
        `Use the final stretch for repeat favourites, souvenir time, and a final ${focus} stop without adding anything that could create travel stress.`
    }
  ];

  return Array.from({ length: totalDays }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);
    const focus = focusPool[index % focusPool.length];
    const isArrival = index === 0;
    const isFinalDay = index === totalDays - 1;
    const template =
      isArrival ? templates[0] : isFinalDay ? templates[5] : templates[(index % 4) + 1];

    let baseNote = template.note(focus);

    if (indoorMode && !isArrival) {
      baseNote += " Choose at least one indoor venue or sheltered district so the weather does not disrupt the whole plan.";
    }

    if (dietaryPreference) {
      baseNote += ` Keep meals aligned with your ${dietaryPreference} preference so food stops are easier to evaluate.`;
    }

    if (budget > 0 && budget <= 600) {
      baseNote += " Favour clustered stops and casual dining to keep transport and meal spending under control.";
    } else if (budget >= 2500) {
      baseNote += " Your budget allows one premium reservation or standout experience without squeezing the rest of the day.";
    }

    const areaLabel = `${trip.destination.city}${trip.destination.state ? `, ${trip.destination.state}` : ""}`;
    const breakfast = isArrival
      ? `Have a light breakfast or coffee near your arrival point in ${areaLabel} so the first half of the day stays flexible.`
      : `Start with breakfast at a well-reviewed local spot in ${areaLabel}, ideally one that matches your ${dietaryPreference || "food"} preference.`;
    const morning = isArrival
      ? `Ease into the trip with one short ${focus} stop near your hotel, then use the rest of the morning to get familiar with the neighbourhood.`
      : `Use the cooler morning hours for your main ${focus} activity and keep transport simple by grouping nearby stops together.`;
    const lunch = dietaryPreference
      ? `Choose a lunch venue in ${areaLabel} that clearly supports ${dietaryPreference} choices and sits close to your next activity.`
      : `Plan lunch in a local district that keeps you close to your next stop instead of crossing the city just to eat.`;
    const afternoon = indoorMode
      ? `Keep the afternoon partly indoors with one museum, market, gallery, or sheltered cultural stop before moving into a lighter activity.`
      : `Spend the afternoon on scenic walks, cultural sights, or one shopping stretch that suits the pace of the day.`;
    const dinner = dietaryPreference
      ? `Use dinner for a stronger ${dietaryPreference} recommendation, ideally somewhere known for local flavour without breaking your budget.`
      : `Save dinner for one memorable local meal that reflects the city’s food culture and gives the day a clear finishing point.`;
    const evening = isFinalDay
      ? `Keep the evening relaxed with one final favourite view, market, or dessert stop before preparing for departure.`
      : `Finish with a low-pressure evening plan such as a viewpoint, night market, riverside walk, or live local district depending on energy.`;
    const supper = totalDays >= 3
      ? `If you still have energy, end with a small supper or dessert stop rather than a long extra activity.`
      : "";

    const cultureNote = `Use at least one stop today to connect with ${trip.destination.country}'s local culture, whether through neighbourhood streets, markets, museums, or historical landmarks.`;
    const shoppingNote =
      budget > 0 && budget <= 600
        ? "Keep shopping focused on compact local markets or low-cost souvenirs so the day stays budget friendly."
        : budget >= 2500
          ? "Your budget allows one premium shopping or reservation-style experience if it fits the route."
          : "If you want shopping time, place it after the main attraction so it does not crowd the core itinerary.";
    const sceneryNote = indoorMode
      ? "Choose one sheltered scenic stop or photo-friendly indoor landmark so weather does not remove the visual highlight of the day."
      : `Leave space for one scenic stop in ${areaLabel}, such as a viewpoint, waterfront, garden, or heritage street.`;
    const foodNote = dietaryPreference
      ? `Meals should stay aligned with your ${dietaryPreference} preference so every food stop remains realistic and easy to shortlist.`
      : "Use meals as natural anchors between activities so the day feels paced instead of rushed.";
    const weatherNote = weatherTip;
    const budgetNote =
      budget > 0
        ? budget <= 600
          ? "Prioritise clustered attractions, casual dining, and shorter transport hops to stay within budget."
          : budget >= 2500
            ? "You can afford one standout reservation, premium activity, or stronger dining choice today."
            : "Keep one paid highlight and balance it with free walks, views, or neighbourhood browsing."
        : "";

    return {
      day: index + 1,
      date: currentDate.toISOString().slice(0, 10),
      focus,
      breakfast,
      morning,
      lunch,
      afternoon,
      dinner,
      evening,
      supper,
      cultureNote,
      shoppingNote,
      sceneryNote,
      foodNote,
      weatherNote,
      budgetNote,
      note: baseNote,
      weatherTip
    };
  });
}

function sanitizeExternalWarning(error, fallbackMessage) {
  const message = String(error?.message || "").toLowerCase();

  if (!message) {
    return fallbackMessage;
  }

  if (
    message.includes("ssl") ||
    message.includes("tls") ||
    message.includes("econn") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("socket") ||
    message.includes("record_layer")
  ) {
    return fallbackMessage;
  }

  if (message.includes("invalid") && message.includes("key")) {
    return fallbackMessage;
  }

  if (message.includes("rate limit")) {
    return fallbackMessage;
  }

  return fallbackMessage;
}

function hasUsefulAiDailyBreakdown(dailyBreakdown = []) {
  if (!Array.isArray(dailyBreakdown) || dailyBreakdown.length < 2) {
    return false;
  }

  const detailedFields = [
    "breakfast",
    "morning",
    "lunch",
    "afternoon",
    "dinner",
    "evening",
    "supper",
    "cultureNote",
    "shoppingNote",
    "sceneryNote",
    "foodNote",
    "weatherNote",
    "budgetNote"
  ];

  const uniqueNarratives = new Set(
    dailyBreakdown
      .map((entry) =>
        detailedFields
          .map((field) => entry?.[field])
          .filter(Boolean)
          .join(" ")
          .trim()
          .toLowerCase()
      )
      .filter((value) => value.length > 40)
  );

  const richEntries = dailyBreakdown.filter((entry) => {
    const populated = detailedFields.filter((field) => String(entry?.[field] || "").trim());
    return populated.length >= 3;
  }).length;

  return richEntries >= 2 && uniqueNarratives.size >= 2;
}

function monthNameFromDate(dateString) {
  return new Date(dateString).toLocaleString("en-US", { month: "long" });
}

function getSeasonForMonth(month, hemisphere = "north") {
  const northern = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
  const southern = ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"];

  return hemisphere === "south" ? southern[month] : northern[month];
}

function getHemisphere(country = "") {
  const southernCountries = ["australia", "new zealand", "argentina", "chile", "south africa", "brazil", "indonesia"];
  return southernCountries.includes(String(country).toLowerCase()) ? "south" : "north";
}

function buildPreferenceMatch(trip, weather) {
  const preferredWeather = String(trip.preferences.weather || "").toLowerCase();
  const startMonth = new Date(trip.startDate).getMonth();
  const tripMonthName = monthNameFromDate(trip.startDate);
  const weatherDescription = String(weather?.description || "").toLowerCase();
  const season = getSeasonForMonth(startMonth, getHemisphere(trip.destination.country));

  if (!preferredWeather) {
    return "";
  }

  if (preferredWeather.includes("winter")) {
    return season === "winter"
      ? `Your selected dates fall in ${tripMonthName}, which aligns well with your winter preference in ${trip.destination.country}.`
      : `You prefer winter weather, but ${tripMonthName} is usually ${season} in ${trip.destination.country}. A cooler travel window would match better.`;
  }

  if (preferredWeather.includes("sunny")) {
    if (weatherDescription.includes("rain") || weatherDescription.includes("storm")) {
      return "You prefer sunny weather, but the live conditions are rainy. A drier season would suit your trip better.";
    }

    if (weatherDescription.includes("cloud")) {
      return "You prefer sunny weather. The current conditions are mild but cloudier than ideal, so outdoor plans are still possible with lower expectations.";
    }

    return "You prefer sunny weather, and the current conditions look well aligned for outdoor exploring.";
  }

  if (preferredWeather.includes("rain")) {
    return weatherDescription.includes("rain")
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

function buildFallbackAttractionIdeas(trip, weather) {
  const interests = trip.preferences.interests.length > 0 ? trip.preferences.interests : ["local highlights"];
  const dietaryPreference = String(trip.preferences.dietary || "").toLowerCase();
  const category = String(trip.category || "Leisure");
  const budget = Number(trip.budget || 0);
  const rainy = String(weather?.description || "").toLowerCase().includes("rain");
  const budgetLabel = budget > 0 && budget <= 600 ? "budget-friendly" : budget >= 2500 ? "premium" : "well-reviewed";

  const suggestions = [
    {
      name: `${trip.destination.city} ${interests[0]} trail`,
      category: interests[0] || category,
      address: `Explore a ${budgetLabel} ${interests[0] || "local"} route around ${trip.destination.city}, ${trip.destination.country}.`,
      openNow: null,
      rating: null,
      source: "planner"
    },
    {
      name: rainy ? "Indoor city highlights" : "Walkable local highlights",
      category: rainy ? "Indoor fallback" : "Scenic route",
      address: rainy
        ? `Rain is possible, so prioritise indoor museums, markets, and cafes around ${trip.destination.city}.`
        : `Use a walkable district in ${trip.destination.city} to combine scenery, short breaks, and flexible timing.`,
      openNow: null,
      rating: null,
      source: "planner"
    },
    {
      name: dietaryPreference ? `${dietaryPreference} cafe picks` : `${budgetLabel} food stops`,
      category: "Food & drink",
      address: dietaryPreference
        ? `Look for cafes and casual dining that clearly support ${dietaryPreference} choices near your selected area.`
        : `Use local review filters to shortlist ${budgetLabel} cafes and dining spots around your trip base.`,
      openNow: null,
      rating: null,
      source: "planner"
    }
  ];

  return suggestions;
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
    trip.preferences.dietary,
    {
      category: trip.category,
      budget: trip.budget
    }
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
    warnings.push(sanitizeExternalWarning(error, "Weather data is temporarily unavailable."));
  }

  try {
    attractions = await getNearbyAttractions(
      `${trip.destination.city}, ${trip.destination.country}`,
      trip.preferences.interests,
      trip.preferences.dietary,
      {
        category: trip.category,
        budget: trip.budget
      }
    );
  } catch (error) {
    warnings.push(sanitizeExternalWarning(error, "Nearby attractions are temporarily unavailable."));
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
      : (aiInsights?.attractionIdeas?.length > 0
          ? aiInsights.attractionIdeas.map((idea, index) => ({
              id: `ai-${index + 1}`,
              name: idea.name || "Suggested place",
              category: idea.category || "Local recommendation",
              address: idea.reason || "Suggested by Gemini based on your trip preferences.",
              openNow: null,
              source: "gemini"
            }))
          : buildFallbackAttractionIdeas(trip, weather).map((idea, index) => ({
              id: `planner-${index + 1}`,
              ...idea
            })));

  if (hasUsefulAiDailyBreakdown(aiInsights?.dailyBreakdown)) {
    dailyBreakdown = dailyBreakdown.map((fallbackDay, index) => {
      const day = aiInsights.dailyBreakdown[index] || {};

      return {
        ...fallbackDay,
        day: Number(day.day) || fallbackDay.day,
        focus: day.focus || fallbackDay.focus,
        breakfast: day.breakfast || fallbackDay.breakfast,
        morning: day.morning || fallbackDay.morning,
        lunch: day.lunch || fallbackDay.lunch,
        afternoon: day.afternoon || fallbackDay.afternoon,
        dinner: day.dinner || fallbackDay.dinner,
        evening: day.evening || fallbackDay.evening,
        supper: day.supper || fallbackDay.supper,
        cultureNote: day.cultureNote || fallbackDay.cultureNote,
        shoppingNote: day.shoppingNote || fallbackDay.shoppingNote,
        sceneryNote: day.sceneryNote || fallbackDay.sceneryNote,
        foodNote: day.foodNote || fallbackDay.foodNote,
        weatherNote: day.weatherNote || fallbackDay.weatherNote,
        budgetNote: day.budgetNote || fallbackDay.budgetNote,
        note:
          [day.morning, day.afternoon, day.evening].filter(Boolean).join(" ").trim() ||
          fallbackDay.note,
        weatherTip:
          [day.foodNote, day.weatherNote, day.budgetNote]
            .filter(Boolean)
            .join(" ")
            .trim() || fallbackDay.weatherTip
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
  const trips = await Trip.find({})
    .populate("user", "name email role")
    .sort({ createdAt: -1 });

  res.json({
    trips
  });
});
