import { AppError } from "../utils/AppError.js";

export async function getNearbyAttractions(city, interests = []) {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    throw new AppError("FOURSQUARE_API_KEY is not configured", 500);
  }

  const query = interests.length > 0 ? interests.join(", ") : "tourist attractions";
  const url = `https://api.foursquare.com/v3/places/search?near=${encodeURIComponent(city)}&query=${encodeURIComponent(query)}&limit=5`;
  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
      Accept: "application/json"
    }
  });

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
    category: place.categories?.[0]?.name || "Attraction"
  }));
}
