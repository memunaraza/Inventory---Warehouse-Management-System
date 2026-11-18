import mongoose from "mongoose";
import Product from "../models/Product.js";
import Stock from "../models/Stock.js";
import StockTransaction from "../models/StockTransaction.js";
import Warehouse from "../models/Warehouse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { canAccessWarehouse } from "../middlewares/auth.middleware.js";
import validateObjectId from "../utils/validateObjectId.js";

export const listStock = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.warehouse) {
    validateObjectId(req.query.warehouse, "warehouse ID");
    if (!canAccessWarehouse(req.user, req.query.warehouse)) {
      throw new ApiError(403, "You cannot access this warehouse.");
    }
    filter.warehouse = req.query.warehouse;
  } else if (req.user.role === "warehouse_manager") {
    filter.warehouse = { $in: req.user.assignedWarehouses };
  }
  if (req.query.product) {
    validateObjectId(req.query.product, "product ID");
    filter.product = req.query.product;
  }

  const stock = await Stock.find(filter)
    .populate("product", "name sku category lowStockLimit price image")
    .populate("warehouse", "name code")
    .sort({ updatedAt: -1 });
  res.json({ success: true, data: { stock } });
});

export const lowStockAlerts = asyncHandler(async (req, res) => {
  const warehouseFilter = req.user.role === "warehouse_manager"
    ? { _id: { $in: req.user.assignedWarehouses } }
    : {};
  if (req.query.warehouse) {
    validateObjectId(req.query.warehouse, "warehouse ID");
    if (!canAccessWarehouse(req.user, req.query.warehouse)) {
      throw new ApiError(403, "You cannot access this warehouse.");
    }
    warehouseFilter._id = req.query.warehouse;
  }
  const [products, warehouses, stocks] = await Promise.all([
    Product.find().select("name sku lowStockLimit"),
    Warehouse.find(warehouseFilter).select("name code"),
    Stock.find(req.user.role === "warehouse_manager"
      ? { warehouse: { $in: req.user.assignedWarehouses } }
      : {}).select("product warehouse quantity")
  ]);
  const quantityByPair = new Map(
    stocks.map((item) => [`${item.product}:${item.warehouse}`, item.quantity])
  );
  const alerts = [];
  for (const product of products) {
    for (const warehouse of warehouses) {
      const quantity = quantityByPair.get(`${product._id}:${warehouse._id}`) || 0;
      if (quantity <= product.lowStockLimit) {
        alerts.push({
          product: { _id: product._id, name: product.name, sku: product.sku },
          warehouse: { _id: warehouse._id, name: warehouse.name, code: warehouse.code },
          quantity,
          lowStockLimit: product.lowStockLimit
        });
      }
    }
  }
  res.json({ success: true, data: { alerts } });
});

export const addStock = asyncHandler(async (req, res) => {
  await changeStock(req, res, "in");
});

export const removeStock = asyncHandler(async (req, res) => {
  await changeStock(req, res, "out");
});

async function changeStock(req, res, type) {
  const { product: productId, warehouse: warehouseId, quantity, reason } = req.body || {};
  validateObjectId(productId, "product ID");
  validateObjectId(warehouseId, "warehouse ID");
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ApiError(400, "Quantity must be a positive whole number.");
  }
  if (!canAccessWarehouse(req.user, warehouseId)) {
    throw new ApiError(403, "You cannot modify stock in this warehouse.");
  }
  const [product, warehouse] = await Promise.all([
    Product.findById(productId).select("_id"),
    Warehouse.findById(warehouseId).select("_id")
  ]);
  if (!product || !warehouse) throw new ApiError(404, "Product or warehouse not found.");

  const session = await mongoose.startSession();
  let updatedStock;
  try {
    await session.withTransaction(async () => {
      if (type === "in") {
        updatedStock = await Stock.findOneAndUpdate(
          { product: productId, warehouse: warehouseId },
          { $inc: { quantity } },
          { new: true, upsert: true, setDefaultsOnInsert: true, session }
        );
      } else {
        updatedStock = await Stock.findOneAndUpdate(
          { product: productId, warehouse: warehouseId, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity } },
          { new: true, session }
        );
        if (!updatedStock) throw new ApiError(409, "Insufficient stock available.");
      }
      await StockTransaction.create([{
        product: productId,
        warehouse: warehouseId,
        type,
        quantity,
        reason,
        performedBy: req.user._id
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  res.status(type === "in" ? 201 : 200).json({
    success: true,
    data: { stock: updatedStock },
    message: type === "in" ? "Stock received." : "Stock removed."
  });
}
