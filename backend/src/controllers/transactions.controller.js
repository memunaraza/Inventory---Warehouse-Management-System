import StockTransaction from "../models/StockTransaction.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { canAccessWarehouse } from "../middlewares/auth.middleware.js";
import validateObjectId from "../utils/validateObjectId.js";

export const listTransactions = asyncHandler(async (req, res) => {
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
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const transactions = await StockTransaction.find(filter)
    .populate("product", "name sku")
    .populate("warehouse", "name code")
    .populate("performedBy", "username role")
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({ success: true, data: { transactions } });
});
