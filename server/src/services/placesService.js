import { AppError } from "../utils/AppError.js";

function buildAttractionQuery(location, interests = [], dietaryPreference = "") {
  const tokens = [...interests];

  if (dietaryPreference) {
    tokens.push(dietaryPreference);
  }

  if (tokens.length === 0) {
    return `tourist attractions near ${location}`;
  }

  return `${tokens.join(" ")} near ${location}`;
}

async function getNearbyAttractionsFromFoursquare(location, interests = [], dietaryPreference = "") {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    throw new AppError("FOURSQUARE_API_KEY is not configured", 500);
  }

  const query = buildAttractionQuery(location, interests, dietaryPreference);
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

async function getNearbyAttractionsFromSerp(location, interests = [], dietaryPreference = "") {
  const apiKey = process.env.SERP_API_KEY;

  if (!apiKey) {
    throw new AppError("SERP_API_KEY is not configured", 500);
  }

  const query = buildAttractionQuery(location, interests, dietaryPreference);
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

export async function getNearbyAttractions(location, interests = [], dietaryPreference = "") {
  const providers = [
    process.env.SERP_API_KEY
      ? () => getNearbyAttractionsFromSerp(location, interests, dietaryPreference)
      : null,
    process.env.FOURSQUARE_API_KEY
      ? () => getNearbyAttractionsFromFoursquare(location, interests, dietaryPreference)
      : null
  ].filter(Boolean);

  for (const provider of providers) {
    try {
      const results = await provider();
      if (results.length > 0) {
        return results;
      }
    } catch (_error) {
      continue;
    }
  }

  return [];
}
