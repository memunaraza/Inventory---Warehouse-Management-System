import mongoose from "mongoose";
import Product from "../models/Product.js";
import Stock from "../models/Stock.js";
import StockTransaction from "../models/StockTransaction.js";
import SupplyRequest from "../models/SupplyRequest.js";
import Warehouse from "../models/Warehouse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import validateObjectId from "../utils/validateObjectId.js";

export const createSupplyRequest = asyncHandler(async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "A supply request requires at least one product.");
  }
  const normalized = [];
  for (const item of items) {
    validateObjectId(item?.product, "product ID");
    validateObjectId(item?.warehouse, "warehouse ID");
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, "Each supply quantity must be a positive whole number.");
    }
    const [product, warehouse] = await Promise.all([
      Product.findById(item.product).select("supplier"),
      Warehouse.findById(item.warehouse).select("_id")
    ]);
    if (!product || !warehouse) throw new ApiError(400, "A product or warehouse was not found.");
    if (!product.supplier || !product.supplier.equals(req.user._id)) {
      throw new ApiError(403, "Supply requests may only include products assigned to your supplier account.");
    }
    normalized.push({ product: product._id, warehouse: warehouse._id, quantity: item.quantity });
  }

  const request = await SupplyRequest.create({ supplier: req.user._id, items: normalized });
  await populateRequest(request);
  res.status(201).json({ success: true, data: { supplyRequest: request } });
});

export const listSupplyRequests = asyncHandler(async (req, res) => {
  const filter = req.user.role === "supplier" ? { supplier: req.user._id } : {};
  if (req.query.status) filter.status = req.query.status;
  const requests = await SupplyRequest.find(filter)
    .populate("supplier", "username email companyName supplierLogo")
    .populate("items.product", "name sku")
    .populate("items.warehouse", "name code")
    .populate("reviewedBy", "username")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { supplyRequests: requests } });
});

export const getSupplyRequest = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "supply request ID");
  const request = await SupplyRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, "Supply request not found.");
  if (req.user.role === "supplier" && !request.supplier.equals(req.user._id)) {
    throw new ApiError(403, "You can only access your own supply requests.");
  }
  await populateRequest(request);
  res.json({ success: true, data: { supplyRequest: request } });
});

export const reviewSupplyRequest = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "supply request ID");
  const { status, reviewNote } = req.body || {};
  if (!["Approved", "Rejected"].includes(status)) {
    throw new ApiError(400, "Status must be Approved or Rejected.");
  }
  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      request = await SupplyRequest.findOneAndUpdate(
        { _id: req.params.id, status: "Pending" },
        { $set: { status, reviewNote, reviewedBy: req.user._id } },
        { new: true, session }
      );
      if (!request) throw new ApiError(409, "Supply request was not found or has already been reviewed.");

      if (status === "Approved") {
        for (const item of request.items) {
          await Stock.findOneAndUpdate(
            { product: item.product, warehouse: item.warehouse },
            { $inc: { quantity: item.quantity } },
            { new: true, upsert: true, setDefaultsOnInsert: true, session }
          );
          await StockTransaction.create([{
            product: item.product,
            warehouse: item.warehouse,
            type: "in",
            quantity: item.quantity,
            reason: `Supply request ${request._id}`,
            reference: request._id,
            performedBy: req.user._id
          }], { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
  await populateRequest(request);
  res.json({ success: true, data: { supplyRequest: request } });
});

async function populateRequest(request) {
  await request.populate([
    { path: "supplier", select: "username email companyName supplierLogo" },
    { path: "items.product", select: "name sku" },
    { path: "items.warehouse", select: "name code" },
    { path: "reviewedBy", select: "username" }
  ]);
}
