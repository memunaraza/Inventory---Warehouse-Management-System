import User, { USER_ROLES } from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import StockTransaction from "../models/StockTransaction.js";
import SupplyRequest from "../models/SupplyRequest.js";
import Warehouse from "../models/Warehouse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import validateObjectId from "../utils/validateObjectId.js";

const publicFields = "-password -__v";

function validateImage(image, label) {
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    throw new ApiError(400, `${label} must include an HTTPS url and ImageKit fileId.`);
  }
  let url;
  try {
    url = new URL(image.url);
  } catch {
    throw new ApiError(400, `${label} must include a valid HTTPS url.`);
  }
  if (url.protocol !== "https:" || typeof image.fileId !== "string" || !image.fileId.trim()) {
    throw new ApiError(400, `${label} must include an HTTPS url and ImageKit fileId.`);
  }
  return { url: url.toString(), fileId: image.fileId.trim() };
}

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select(publicFields)
    .populate("assignedWarehouses", "name code");
  res.json({ success: true, data: { users } });
});

export const getUser = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "user ID");
  const user = await User.findById(req.params.id).select(publicFields)
    .populate("assignedWarehouses", "name code");
  if (!user) throw new ApiError(404, "User not found.");
  res.json({ success: true, data: { user } });
});

export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, role, assignedWarehouses = [], ...profile } = req.body || {};
  if (!username || !email || !password || !role) {
    throw new ApiError(400, "Username, email, password, and role are required.");
  }
  if (!USER_ROLES.includes(role)) {
    throw new ApiError(400, "Choose a valid user role.");
  }
  const ids = role === "warehouse_manager" ? await validateWarehouses(assignedWarehouses) : [];
  if (role !== "warehouse_manager" && assignedWarehouses.length) {
    throw new ApiError(400, "Only warehouse managers can be assigned warehouses.");
  }

  const user = await User.create({
    username,
    email,
    password,
    role,
    phone: profile.phone,
    companyName: profile.companyName,
    profileImage: profile.profileImage ? validateImage(profile.profileImage, "Profile image") : undefined,
    supplierLogo: profile.supplierLogo ? validateImage(profile.supplierLogo, "Supplier logo") : undefined,
    assignedWarehouses: ids
  });
  await syncManagerAssignments(user._id, ids);
  await user.populate("assignedWarehouses", "name code");
  res.status(201).json({ success: true, data: { user: user.toObject({ transform: hidePassword }) } });
});

export const updateUser = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "user ID");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");

  const body = req.body || {};
  for (const field of ["username", "email", "phone", "companyName", "isActive"]) {
    if (body[field] !== undefined) user[field] = body[field];
  }
  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 8) {
      throw new ApiError(400, "Password must contain at least 8 characters.");
    }
    user.password = body.password;
  }
  if (body.role !== undefined) {
    if (!USER_ROLES.includes(body.role)) throw new ApiError(400, "Choose a valid user role.");
    user.role = body.role;
  }
  if (body.profileImage !== undefined) user.profileImage = validateImage(body.profileImage, "Profile image");
  if (body.supplierLogo !== undefined) user.supplierLogo = validateImage(body.supplierLogo, "Supplier logo");

  let assigned;
  if (body.assignedWarehouses !== undefined) {
    if (user.role !== "warehouse_manager") {
      throw new ApiError(400, "Only warehouse managers can be assigned warehouses.");
    }
    assigned = await validateWarehouses(body.assignedWarehouses);
    user.assignedWarehouses = assigned;
  } else if (user.role !== "warehouse_manager") {
    assigned = [];
    user.assignedWarehouses = [];
  }

  await user.save();
  if (assigned) await syncManagerAssignments(user._id, assigned);
  await user.populate("assignedWarehouses", "name code");
  res.json({ success: true, data: { user: user.toObject({ transform: hidePassword }) } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "user ID");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");
  if (user._id.equals(req.user._id)) throw new ApiError(400, "You cannot delete your own account.");
  const hasHistory = await Product.exists({ supplier: user._id }) ||
    await SupplyRequest.exists({ supplier: user._id }) ||
    await Order.exists({ salesRepresentative: user._id }) ||
    await StockTransaction.exists({ performedBy: user._id });
  if (hasHistory) {
    throw new ApiError(409, "Users referenced by products or records cannot be deleted.");
  }
  await Warehouse.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
  await user.deleteOne();
  res.json({ success: true, message: "User deleted." });
});

export const updateOwnProfile = asyncHandler(async (req, res) => {
  const { username, phone, companyName, profileImage, supplierLogo } = req.body || {};
  if (username !== undefined) req.user.username = username;
  if (phone !== undefined) req.user.phone = phone;
  if (req.user.role === "supplier" && companyName !== undefined) req.user.companyName = companyName;
  if (profileImage !== undefined) req.user.profileImage = validateImage(profileImage, "Profile image");
  if (req.user.role === "supplier" && supplierLogo !== undefined) {
    req.user.supplierLogo = validateImage(supplierLogo, "Supplier logo");
  }
  await req.user.save();
  res.json({ success: true, data: { user: req.user.toObject({ transform: hidePassword }) } });
});

async function validateWarehouses(value) {
  if (!Array.isArray(value)) throw new ApiError(400, "assignedWarehouses must be an array of warehouse IDs.");
  const uniqueIds = [...new Set(value.map(String))];
  uniqueIds.forEach((id) => validateObjectId(id, "warehouse ID"));
  const warehouses = await Warehouse.find({ _id: { $in: uniqueIds } }).select("_id");
  if (warehouses.length !== uniqueIds.length) throw new ApiError(400, "One or more warehouses were not found.");
  return warehouses.map(({ _id }) => _id);
}

async function syncManagerAssignments(userId, warehouseIds) {
  await Warehouse.updateMany(
    { manager: userId, _id: { $nin: warehouseIds } },
    { $unset: { manager: 1 } }
  );
  if (warehouseIds.length) {
    const previous = await Warehouse.find({ _id: { $in: warehouseIds }, manager: { $exists: true, $ne: userId } })
      .select("manager");
    const previousManagerIds = [...new Set(previous.map(({ manager }) => manager.toString()))];
    if (previousManagerIds.length) {
      await User.updateMany(
        { _id: { $in: previousManagerIds } },
        { $pull: { assignedWarehouses: { $in: warehouseIds } } }
      );
    }
    await Warehouse.updateMany({ _id: { $in: warehouseIds } }, { $set: { manager: userId } });
  }
}

function hidePassword(_doc, ret) {
  delete ret.password;
  delete ret.__v;
  return ret;
}
