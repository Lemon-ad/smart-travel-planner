export function errorHandler(error, _req, res, _next) {
  if (error.name === "JsonWebTokenError") {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  if (error.code === 11000) {
    res.status(409).json({ message: "A record with this value already exists" });
    return;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Internal server error"
  });
}
