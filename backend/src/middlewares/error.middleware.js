import ApiError from "../utils/ApiError.js";

export function notFound(_req, _res, next) {
  next(new ApiError(404, "API route not found."));
}

export function errorHandler(error, _req, res, _next) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return res.status(409).json({
      success: false,
      message: `${field} is already in use.`
    });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  if (statusCode >= 500) {
    console.error("API request failed:", error);
  }
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "An unexpected server error occurred." : error.message
  });
}
