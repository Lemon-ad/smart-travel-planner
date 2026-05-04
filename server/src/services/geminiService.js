import { AppError } from "../utils/AppError.js";

function extractJsonObject(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found");
  }

  return JSON.parse(raw.slice(start, end + 1));
}

export async function generateAiTripInsights({ trip, weather, attractions, packingList }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const prompt = `
You are a smart travel planning assistant.
Return only valid JSON with this shape:
{
  "headline": "short headline",
  "summary": "2 to 3 sentence summary",
  "weatherOutlook": "1 sentence that mentions the current weather condition such as sunny, rainy, windy, cool or hot",
  "timingTip": "1 sentence about whether the chosen dates match the user's preferred weather and if not suggest a better season or month range",
  "preferenceMatch": "1 sentence explaining how well the trip matches the saved preferences like winter or sunny weather",
  "foodTip": "1 sentence about dining choices using the dietary preference",
  "packingList": ["5 to 8 practical packing items"],
  "attractionIdeas": [
    {
      "name": "place or place type",
      "category": "cafe, market, temple, museum, park",
      "reason": "why it fits the user's interests and dietary preference"
    }
  ],
  "dailyBreakdown": [
    {
      "day": 1,
      "focus": "short theme for the day",
      "morning": "specific morning idea",
      "afternoon": "specific afternoon idea",
      "evening": "specific evening idea",
      "foodNote": "what to look for food-wise",
      "weatherNote": "weather-aware note for the day"
    }
  ],
  "highlights": ["bullet 1", "bullet 2", "bullet 3"]
}

Rules:
- Use the saved preferences seriously.
- If preferred weather is something like "winter", "cool", "sunny", or "rainy", explicitly say whether the selected dates match that preference.
- If dietary preference says "no beef", "halal", "vegetarian", or similar, use that in food advice and attraction ideas.
- Nearby attractions can be real places from the API results, but if API results are missing, create useful attraction ideas based on the destination, category, interests, and dietary preference.
- Daily breakdown entries must vary by day. Do not repeat the same text across all days.
- Keep advice realistic for the destination and budget.
- The number of dailyBreakdown items should match the trip length as closely as possible, up to 7 days. If the trip is longer than 7 days, combine later days into broader themes but still vary them.

Trip data:
- Title: ${trip.title}
- Destination: ${trip.destination.city}${trip.destination.state ? `, ${trip.destination.state}` : ""}, ${trip.destination.country}
- Category: ${trip.category}
- Dates: ${trip.startDate} to ${trip.endDate}
- Notes: ${trip.notes || "None"}
- Preferred weather: ${trip.preferences.weather || "None"}
- Dietary: ${trip.preferences.dietary || "None"}
- Interests: ${trip.preferences.interests.join(", ") || "None"}
- Budget RM: ${trip.budget}

Weather:
- Temperature: ${weather.temperature}
- Feels like: ${weather.feelsLike}
- Condition: ${weather.description}
- Humidity: ${weather.humidity}
- Wind: ${weather.windSpeed}

Attractions:
${attractions.slice(0, 5).map((place) => `- ${place.name} (${place.category})`).join("\n") || "- None"}

Packing list:
${packingList.map((item) => `- ${item}`).join("\n")}
`;

  let response;

  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );
  } catch (_error) {
    throw new AppError("Gemini AI request failed", 502);
  }

  if (!response.ok) {
    throw new AppError("Gemini AI could not generate travel insights", 502);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim() || "";

  if (!text) {
    return null;
  }

  try {
    const parsed = extractJsonObject(text);

    return {
      headline: parsed.headline || "AI Trip Notes",
      summary: parsed.summary || text,
      weatherOutlook: parsed.weatherOutlook || "",
      timingTip: parsed.timingTip || "",
      preferenceMatch: parsed.preferenceMatch || "",
      foodTip: parsed.foodTip || "",
      packingList: Array.isArray(parsed.packingList) ? parsed.packingList : [],
      attractionIdeas: Array.isArray(parsed.attractionIdeas) ? parsed.attractionIdeas : [],
      dailyBreakdown: Array.isArray(parsed.dailyBreakdown) ? parsed.dailyBreakdown : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : []
    };
  } catch (_error) {
    return {
      headline: "AI Trip Notes",
      summary: text,
      weatherOutlook: "",
      timingTip: "",
      preferenceMatch: "",
      foodTip: "",
      packingList: [],
      attractionIdeas: [],
      dailyBreakdown: [],
      highlights: []
    };
  }
}
