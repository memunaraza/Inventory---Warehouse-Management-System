import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  const token = bearer || req.cookies?.token;
  if (!token) {
    throw new ApiError(401, "Authentication is required.");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Your session is invalid or has expired.");
  }

  const user = await User.findById(payload.sub).select("-password");
  if (!user || !user.isActive) {
    throw new ApiError(401, "Your account is unavailable.");
  }

  req.user = user;
  next();
});

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action."));
    }
    return next();
  };
}

export function canAccessWarehouse(user, warehouseId) {
  return user.role === "admin" ||
    (user.role === "warehouse_manager" &&
      user.assignedWarehouses.some((id) => id.toString() === warehouseId.toString()));
}
