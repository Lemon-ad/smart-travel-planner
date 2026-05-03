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
  "summary": "2 sentence summary",
  "timingTip": "1 sentence",
  "foodTip": "1 sentence",
  "highlights": ["bullet 1", "bullet 2", "bullet 3"]
}

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
    return extractJsonObject(text);
  } catch (_error) {
    return {
      headline: "AI Trip Notes",
      summary: text,
      timingTip: "",
      foodTip: "",
      highlights: []
    };
  }
}
