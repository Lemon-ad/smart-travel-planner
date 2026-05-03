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
