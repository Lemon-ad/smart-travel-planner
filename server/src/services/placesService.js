import { AppError } from "../utils/AppError.js";

function normalizeTerms(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandDietaryTerms(dietaryPreference = "") {
  const dietary = String(dietaryPreference || "").toLowerCase();

  if (!dietary) {
    return [];
  }

  if (dietary.includes("no beef")) {
    return ["no beef", "seafood", "chicken", "vegetarian-friendly"];
  }

  if (dietary.includes("halal")) {
    return ["halal", "muslim friendly"];
  }

  if (dietary.includes("vegetarian")) {
    return ["vegetarian", "vegan-friendly"];
  }

  return [dietaryPreference];
}

function budgetStyle(budget = 0) {
  if (budget > 0 && budget <= 300) {
    return "budget";
  }

  if (budget > 300 && budget <= 1500) {
    return "mid-range";
  }

  if (budget > 1500) {
    return "premium";
  }

  return "";
}

function categoryTerms(category = "") {
  const normalized = String(category || "").toLowerCase();
  const map = {
    foodie: ["restaurants", "cafes", "street food", "local food"],
    adventure: ["hiking", "outdoor attractions", "nature spots"],
    family: ["family attractions", "parks", "aquariums", "easy cafes"],
    business: ["business district cafes", "quiet restaurants", "city highlights"],
    leisure: ["top attractions", "cafes", "parks", "museums"]
  };

  return map[normalized] || ["top attractions"];
}

function interestTerms(interests = []) {
  return interests.flatMap((item) => {
    const normalized = String(item || "").toLowerCase();

    if (normalized.includes("cafe")) {
      return ["cafe", "coffee shop", "brunch"];
    }

    if (normalized.includes("museum")) {
      return ["museum", "gallery"];
    }

    if (normalized.includes("park")) {
      return ["park", "garden"];
    }

    if (normalized.includes("history")) {
      return ["historic site", "museum", "temple"];
    }

    return [item];
  });
}

function dedupeQueries(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function buildAttractionQueries({
  location,
  interests = [],
  dietaryPreference = "",
  category = "",
  budget = 0
}) {
  const interestTokens = interestTerms(interests);
  const dietaryTokens = expandDietaryTerms(dietaryPreference);
  const categoryTokens = categoryTerms(category);
  const budgetToken = budgetStyle(budget);
  const primaryType = interestTokens[0] || categoryTokens[0] || "top attractions";

  return dedupeQueries([
    `${primaryType} near ${location}`,
    `${interestTokens.join(" ")} near ${location}`,
    `${categoryTokens.join(" ")} near ${location}`,
    dietaryTokens.length > 0 ? `${dietaryTokens.join(" ")} ${primaryType} near ${location}` : "",
    budgetToken ? `${budgetToken} ${primaryType} near ${location}` : "",
    `${[...interestTokens, ...dietaryTokens, budgetToken].filter(Boolean).join(" ")} near ${location}`,
    `tourist attractions near ${location}`
  ]);
}

function buildPlaceTypeFilter(interests = [], category = "") {
  const combined = [...interests.map((item) => String(item).toLowerCase()), String(category || "").toLowerCase()];

  if (combined.some((item) => item.includes("cafe") || item.includes("food"))) {
    return ["cafe", "coffee", "restaurant", "bakery", "brunch", "tea"];
  }

  if (combined.some((item) => item.includes("museum") || item.includes("history"))) {
    return ["museum", "gallery", "historic", "temple", "monument"];
  }

  if (combined.some((item) => item.includes("park") || item.includes("nature"))) {
    return ["park", "garden", "nature", "outdoor"];
  }

  return [];
}

function buildAttractionQuery(query, location) {
  return `${query}`.includes("near ") ? query : `${query} near ${location}`;
}

function scoreAttraction(place, { dietaryPreference = "", interests = [], budget = 0, typeFilter = [] }) {
  let score = 0;
  const haystack = `${place.name} ${place.category} ${place.address}`.toLowerCase();
  const dietaryTokens = expandDietaryTerms(dietaryPreference).map((item) => item.toLowerCase());
  const interestTokens = interestTerms(interests).map((item) => String(item).toLowerCase());

  if (typeof place.openNow === "boolean") {
    score += place.openNow ? 3 : -2;
  }

  if (typeof place.rating === "number") {
    score += Math.min(3, Math.round(place.rating / 2));
  }

  if (budget > 0 && budget <= 300 && /(budget|cheap|affordable|street)/.test(haystack)) {
    score += 2;
  }

  if (budget > 1500 && /(luxury|fine dining|premium|exclusive)/.test(haystack)) {
    score += 2;
  }

  dietaryTokens.forEach((token) => {
    if (haystack.includes(token)) {
      score += 3;
    }
  });

  interestTokens.forEach((token) => {
    if (haystack.includes(token)) {
      score += 2;
    }
  });

  if (typeFilter.length > 0 && typeFilter.some((token) => haystack.includes(token))) {
    score += 4;
  }

  return score;
}

async function getNearbyAttractionsFromFoursquare(location, query) {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    throw new AppError("FOURSQUARE_API_KEY is not configured", 500);
  }

  const url = `https://api.foursquare.com/v3/places/search?near=${encodeURIComponent(location)}&query=${encodeURIComponent(query)}&limit=5`;
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json"
      }
    });
  } catch (_error) {
    throw new AppError("Foursquare could not be reached", 502);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AppError("Invalid places API key", 502);
    }

    if (response.status === 429) {
      throw new AppError("Places API rate limit reached", 502);
    }

    throw new AppError("Failed to fetch nearby attractions", 502);
  }

  const data = await response.json();

  return (data.results || []).map((place) => ({
    id: place.fsq_id,
    name: place.name,
    address: place.location?.formatted_address || "Address unavailable",
    category: place.categories?.[0]?.name || "Attraction",
    openNow:
      typeof place.closed_bucket === "string"
        ? place.closed_bucket === "LikelyOpen"
        : null,
    rating: place.rating || null,
    source: "foursquare"
  }));
}

async function getNearbyAttractionsFromSerp(location, query) {
  const apiKey = process.env.SERP_API_KEY;

  if (!apiKey) {
    throw new AppError("SERP_API_KEY is not configured", 500);
  }

  const url = `https://serpapi.com/search.json?engine=google_maps&type=search&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}`;
  let response;

  try {
    response = await fetch(url);
  } catch (_error) {
    throw new AppError("SerpAPI could not be reached", 502);
  }

  if (!response.ok) {
    throw new AppError("SerpAPI could not fetch nearby attractions", 502);
  }

  const data = await response.json();

  const localResults = data.local_results || data.places_results || [];

  return localResults.slice(0, 5).map((place, index) => ({
    id: place.place_id || place.data_id || `serp-${index + 1}`,
    name: place.title || "Suggested place",
    address: place.address || "Address unavailable",
    category: place.type || place.types?.[0] || "Attraction",
    openNow:
      typeof place.open_state === "string"
        ? place.open_state.toLowerCase().includes("open")
        : null,
    rating: place.rating || null,
    source: "serp"
  }));
}

export async function getNearbyAttractions(
  location,
  interests = [],
  dietaryPreference = "",
  options = {}
) {
  const { category = "", budget = 0 } = options;
  const queries = buildAttractionQueries({
    location,
    interests,
    dietaryPreference,
    category,
    budget
  });
  const typeFilter = buildPlaceTypeFilter(interests, category);
  const providers = [
    process.env.SERP_API_KEY ? (query) => getNearbyAttractionsFromSerp(location, query) : null,
    process.env.FOURSQUARE_API_KEY ? (query) => getNearbyAttractionsFromFoursquare(location, query) : null
  ].filter(Boolean);

  const mergedResults = new Map();

  for (const provider of providers) {
    for (const query of queries) {
      try {
        const results = await provider(buildAttractionQuery(query, location));
        results.forEach((result) => {
          const stableKey = `${result.name}-${result.address}`;
          const current = mergedResults.get(stableKey);

          if (!current || scoreAttraction(result, { dietaryPreference, interests, budget, typeFilter }) >
            scoreAttraction(current, { dietaryPreference, interests, budget, typeFilter })) {
            mergedResults.set(stableKey, result);
          }
        });
      } catch (_error) {
        continue;
      }
    }
  }

  return [...mergedResults.values()]
    .sort(
      (left, right) =>
        scoreAttraction(right, { dietaryPreference, interests, budget, typeFilter }) -
        scoreAttraction(left, { dietaryPreference, interests, budget, typeFilter })
    )
    .slice(0, 8);
}
