import { AppError } from "../utils/AppError.js";

export function validateRequiredFields(fields, payload) {
  const missingFields = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === "";
  });

  if (missingFields.length > 0) {
    throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
  }
}

export function validateEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  return normalizedEmail;
}

export function validatePassword(password) {
  const normalizedPassword = String(password || "");

  if (normalizedPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400);
  }

  return normalizedPassword;
}

export function validateDisplayName(name) {
  const normalizedName = String(name || "").trim();

  if (normalizedName.length < 2) {
    throw new AppError("Display name must be at least 2 characters long", 400);
  }

  return normalizedName;
}

export function validateTripInput(body) {
  validateRequiredFields(
    ["title", "destinationCity", "destinationCountry", "startDate", "endDate"],
    body
  );

  const title = String(body.title || "").trim();
  const destinationState = String(body.destinationState || "").trim();
  const destinationCity = String(body.destinationCity || "").trim();
  const destinationCountry = String(body.destinationCountry || "").trim();
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  const budget = Number(body.budget || 0);

  if (title.length < 3) {
    throw new AppError("Trip title must be at least 3 characters long", 400);
  }

  if (destinationCity.length < 2 || destinationCountry.length < 2) {
    throw new AppError("Destination city and country must be at least 2 characters long", 400);
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError("Please enter valid trip dates", 400);
  }

  if (endDate < startDate) {
    throw new AppError("End date cannot be earlier than start date", 400);
  }

  if (!Number.isFinite(budget) || budget < 0) {
    throw new AppError("Budget must be a positive number or 0", 400);
  }

  return {
    title,
    destinationState,
    destinationCity,
    destinationCountry,
    budget
  };
}
