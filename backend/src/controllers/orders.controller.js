import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Stock from "../models/Stock.js";
import StockTransaction from "../models/StockTransaction.js";
import Warehouse from "../models/Warehouse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { canAccessWarehouse } from "../middlewares/auth.middleware.js";
import validateObjectId from "../utils/validateObjectId.js";

export const createOrder = asyncHandler(async (req, res) => {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "An order requires at least one product.");
  }
  if (customer !== undefined && (
    !customer || typeof customer !== "object" ||
    typeof customer.name !== "string" || !customer.name.trim() ||
    typeof customer.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
  )) {
    throw new ApiError(400, "Customer name and a valid customer email are required.");
  }

  const normalized = [];
  let totalAmount = 0;
  for (const item of items) {
    validateObjectId(item?.product, "product ID");
    validateObjectId(item?.warehouse, "warehouse ID");
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, "Each order quantity must be a positive whole number.");
    }
    const [product, warehouse] = await Promise.all([
      Product.findById(item.product).select("price"),
      Warehouse.findById(item.warehouse).select("_id")
    ]);
    if (!product || !warehouse) throw new ApiError(400, "An order product or warehouse was not found.");
    const stock = await Stock.findOne({
      product: product._id,
      warehouse: warehouse._id
    }).select("quantity");
    const alreadyAdded = normalized
      .filter((entry) => entry.product.equals(product._id) && entry.warehouse.equals(warehouse._id))
      .reduce((sum, entry) => sum + entry.quantity, 0);
    if ((stock?.quantity || 0) < alreadyAdded + item.quantity) {
      throw new ApiError(409, `Insufficient stock for product ${product._id}.`);
    }
    normalized.push({
      product: product._id,
      warehouse: warehouse._id,
      quantity: item.quantity,
      unitPrice: product.price
    });
    totalAmount += product.price * item.quantity;
  }

  const order = await Order.create({
    salesRepresentative: req.user._id,
    customer: customer ? {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: typeof customer.phone === "string" ? customer.phone.trim() : undefined
    } : undefined,
    items: normalized,
    totalAmount: Math.round((totalAmount + Number.EPSILON) * 100) / 100
  });
  await order.populate([
    { path: "salesRepresentative", select: "username email" },
    { path: "items.product", select: "name sku image" },
    { path: "items.warehouse", select: "name code" }
  ]);
  res.status(201).json({ success: true, data: { order } });
});

export const listOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "sales_representative") {
    filter.salesRepresentative = req.user._id;
  } else if (req.user.role === "warehouse_manager") {
    filter["items.warehouse"] = { $in: req.user.assignedWarehouses };
  }
  if (req.query.status) filter.status = req.query.status;
  const orders = await Order.find(filter)
    .populate("salesRepresentative", "username email")
    .populate("items.product", "name sku image")
    .populate("items.warehouse", "name code")
    .sort({ createdAt: -1 });
  const visibleOrders = req.user.role === "warehouse_manager"
    ? orders.filter((order) => order.items.every((item) => canAccessWarehouse(req.user, item.warehouse._id)))
    : orders;
  res.json({ success: true, data: { orders: visibleOrders } });
});

export const getOrder = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "order ID");
  const order = await Order.findById(req.params.id)
    .populate("salesRepresentative", "username email")
    .populate("items.product", "name sku image")
    .populate("items.warehouse", "name code");
  if (!order) throw new ApiError(404, "Order not found.");
  assertCanViewOrder(req.user, order);
  res.json({ success: true, data: { order } });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "order ID");
  const { status } = req.body || {};
  if (!["Processing", "Completed", "Cancelled"].includes(status)) {
    throw new ApiError(400, "Status must be Processing, Completed, or Cancelled.");
  }
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found.");

  if (status === "Cancelled") {
    if (order.status !== "Pending") {
      throw new ApiError(409, "Only pending orders can be cancelled.");
    }
    if (req.user.role !== "admin" && !order.salesRepresentative.equals(req.user._id)) {
      throw new ApiError(403, "You can only cancel your own orders.");
    }
    const filter = { _id: order._id, status: "Pending" };
    if (req.user.role !== "admin") filter.salesRepresentative = req.user._id;
    const cancelled = await Order.findOneAndUpdate(
      filter,
      { $set: { status: "Cancelled" } },
      { new: true }
    );
    if (!cancelled) throw new ApiError(409, "This order has already been processed.");
    order.status = cancelled.status;
  } else if (status === "Processing") {
    if (!["admin", "warehouse_manager"].includes(req.user.role)) {
      throw new ApiError(403, "Only an administrator or assigned warehouse manager can process orders.");
    }
    if (order.status !== "Pending") {
      throw new ApiError(409, "Only pending orders can be processed.");
    }
    for (const item of order.items) {
      if (!canAccessWarehouse(req.user, item.warehouse)) {
        throw new ApiError(403, "You are not assigned to every warehouse in this order.");
      }
    }
    await deductOrderStock(order, req.user._id);
  } else {
    if (!["admin", "warehouse_manager"].includes(req.user.role)) {
      throw new ApiError(403, "Only an administrator or assigned warehouse manager can complete orders.");
    }
    if (order.status !== "Processing") {
      throw new ApiError(409, "Only processing orders can be completed.");
    }
    for (const item of order.items) {
      if (!canAccessWarehouse(req.user, item.warehouse)) {
        throw new ApiError(403, "You are not assigned to every warehouse in this order.");
      }
    }
    order.status = "Completed";
    await order.save();
  }

  await order.populate([
    { path: "salesRepresentative", select: "username email" },
    { path: "items.product", select: "name sku image" },
    { path: "items.warehouse", select: "name code" }
  ]);
  res.json({ success: true, data: { order } });
});

function assertCanViewOrder(user, order) {
  if (user.role === "admin") return;
  if (user.role === "sales_representative" && order.salesRepresentative._id.equals(user._id)) return;
  if (
    user.role === "warehouse_manager" &&
    order.items.every((item) => canAccessWarehouse(user, item.warehouse._id))
  ) return;
  throw new ApiError(403, "You cannot access this order.");
}

async function deductOrderStock(order, performedBy) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const transitioned = await Order.findOneAndUpdate(
        { _id: order._id, status: "Pending" },
        { $set: { status: "Processing" } },
        { new: true, session }
      );
      if (!transitioned) throw new ApiError(409, "This order has already been processed.");

      for (const item of order.items) {
        const stock = await Stock.findOneAndUpdate(
          {
            product: item.product,
            warehouse: item.warehouse,
            quantity: { $gte: item.quantity }
          },
          { $inc: { quantity: -item.quantity } },
          { new: true, session }
        );
        if (!stock) throw new ApiError(409, "Insufficient stock to process this order.");
        await StockTransaction.create([{
          product: item.product,
          warehouse: item.warehouse,
          type: "out",
          quantity: item.quantity,
          reason: `Order ${order._id}`,
          reference: order._id,
          performedBy
        }], { session });
      }
      order.status = transitioned.status;
    });
  } finally {
    await session.endSession();
  }
}
