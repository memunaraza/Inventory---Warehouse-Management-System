import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    phone: user.phone,
    companyName: user.companyName,
    profileImage: user.profileImage,
    supplierLogo: user.supplierLogo
  };
}

function issueToken(user, res) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign({ sub: user._id.toString() }, secret, { expiresIn });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
  return token;
}

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body || {};
  if (
    typeof username !== "string" || username.trim().length < 2 ||
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" || password.length < 8
  ) {
    throw new ApiError(400, "Provide a username, valid email, and password with at least 8 characters.");
  }

  const user = await User.create({
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: "sales_representative"
  });
  issueToken(user, res);
  return res.status(201).json({ success: true, data: { user: publicUser(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body || {};
  const identifier = typeof email === "string" ? email.trim().toLowerCase()
    : typeof username === "string" ? username.trim() : "";
  if (!identifier || typeof password !== "string") {
    throw new ApiError(400, "Email or username and password are required.");
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
  }).select("+password");
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email, username, or password.");
  }

  issueToken(user, res);
  return res.json({ success: true, data: { user: publicUser(user) } });
});

export const currentUser = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/"
  });
  res.json({ success: true, message: "Signed out successfully." });
});
