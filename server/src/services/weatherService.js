import { AppError } from "../utils/AppError.js";

export async function getWeatherForDestination(city, country) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new AppError("OPENWEATHER_API_KEY is not configured", 500);
  }

  const query = encodeURIComponent(`${city},${country}`);
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&units=metric&appid=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new AppError("Invalid weather API key", 502);
    }

    if (response.status === 429) {
      throw new AppError("Weather API rate limit reached", 502);
    }

    throw new AppError("Failed to fetch weather data", 502);
  }

  const data = await response.json();

  return {
    location: data.name,
    temperature: data.main?.temp,
    feelsLike: data.main?.feels_like,
    humidity: data.main?.humidity,
    description: data.weather?.[0]?.description || "No description",
    windSpeed: data.wind?.speed
  };
}

export function buildPackingSuggestion(weather) {
  const items = ["travel documents", "phone charger"];

  if (weather.temperature <= 18) {
    items.push("light jacket", "closed shoes");
  }

  if (weather.temperature >= 30) {
    items.push("sunscreen", "hat", "water bottle");
  }

  if ((weather.description || "").includes("rain")) {
    items.push("umbrella", "waterproof shoes");
  }

  if ((weather.description || "").includes("cloud")) {
    items.push("light layers");
  }

  if ((weather.windSpeed || 0) >= 8) {
    items.push("wind-resistant outerwear");
  }

  return items;
}
