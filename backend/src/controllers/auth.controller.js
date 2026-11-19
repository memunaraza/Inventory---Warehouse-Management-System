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
  const { username, email, password, role, phone, companyName, supplierLogo } = req.body || {};
  if (
    typeof username !== "string" || username.trim().length < 2 ||
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" || password.length < 8 ||
    typeof phone !== "string" || !/^[+]?[\d\s().-]{7,20}$/.test(phone.trim()) ||
    !["supplier", "sales_representative"].includes(role)
  ) {
    throw new ApiError(400, "Provide a valid name, email, phone, password, and public account role.");
  }

  if (role === "supplier" && (typeof companyName !== "string" || companyName.trim().length < 2)) {
    throw new ApiError(400, "A company name is required for supplier registration.");
  }

  let validatedSupplierLogo;
  if (role === "supplier" && supplierLogo !== undefined) {
    if (!supplierLogo || typeof supplierLogo !== "object" || Array.isArray(supplierLogo)) {
      throw new ApiError(400, "Supplier logo must be an uploaded ImageKit image.");
    }
    let url;
    try {
      url = new URL(supplierLogo.url);
    } catch {
      throw new ApiError(400, "Supplier logo must include a valid HTTPS ImageKit URL.");
    }
    if (url.protocol !== "https:" || typeof supplierLogo.fileId !== "string" || !supplierLogo.fileId.trim()) {
      throw new ApiError(400, "Supplier logo must include an HTTPS URL and ImageKit fileId.");
    }
    validatedSupplierLogo = { url: url.toString(), fileId: supplierLogo.fileId.trim() };
  }

  let user;
  try {
    user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      role,
      ...(role === "supplier" ? { companyName: companyName.trim(), supplierLogo: validatedSupplierLogo } : {})
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "An account already exists with this email or full name.");
    }
    throw error;
  }
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
