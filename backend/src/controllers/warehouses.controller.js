import Order from "../models/Order.js";
import Stock from "../models/Stock.js";
import StockTransaction from "../models/StockTransaction.js";
import SupplyRequest from "../models/SupplyRequest.js";
import User from "../models/User.js";
import Warehouse from "../models/Warehouse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import validateObjectId from "../utils/validateObjectId.js";

export const listWarehouses = asyncHandler(async (req, res) => {
  const filter = req.user.role === "warehouse_manager"
    ? { _id: { $in: req.user.assignedWarehouses } }
    : {};
  const warehouses = await Warehouse.find(filter).populate("manager", "username email")
    .sort({ name: 1 });
  res.json({ success: true, data: { warehouses } });
});

export const getWarehouse = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "warehouse ID");
  if (
    req.user.role === "warehouse_manager" &&
    !req.user.assignedWarehouses.some((id) => id.toString() === req.params.id)
  ) {
    throw new ApiError(403, "You cannot access this warehouse.");
  }
  const warehouse = await Warehouse.findById(req.params.id).populate("manager", "username email");
  if (!warehouse) throw new ApiError(404, "Warehouse not found.");
  res.json({ success: true, data: { warehouse } });
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, address, manager } = req.body || {};
  if (!name || !code || !address) {
    throw new ApiError(400, "Warehouse name, code, and address are required.");
  }
  let managerUser;
  if (manager) managerUser = await findManager(manager);
  const warehouse = await Warehouse.create({ name, code, address, manager: managerUser?._id });
  if (managerUser) {
    await User.updateOne({ _id: managerUser._id }, { $addToSet: { assignedWarehouses: warehouse._id } });
  }
  await warehouse.populate("manager", "username email");
  res.status(201).json({ success: true, data: { warehouse } });
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "warehouse ID");
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) throw new ApiError(404, "Warehouse not found.");
  const { name, code, address, manager } = req.body || {};
  if (name !== undefined) warehouse.name = name;
  if (code !== undefined) warehouse.code = code;
  if (address !== undefined) warehouse.address = address;

  if (manager !== undefined) {
    const newManager = manager === null || manager === "" ? null : await findManager(manager);
    if (warehouse.manager && (!newManager || !warehouse.manager.equals(newManager._id))) {
      await User.updateOne(
        { _id: warehouse.manager },
        { $pull: { assignedWarehouses: warehouse._id } }
      );
    }
    warehouse.manager = newManager?._id;
    if (newManager) {
      await User.updateOne(
        { _id: newManager._id },
        { $addToSet: { assignedWarehouses: warehouse._id } }
      );
    }
  }
  await warehouse.save();
  await warehouse.populate("manager", "username email");
  res.json({ success: true, data: { warehouse } });
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "warehouse ID");
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) throw new ApiError(404, "Warehouse not found.");
  const hasStockHistory = await Stock.exists({ warehouse: warehouse._id }) ||
    await StockTransaction.exists({ warehouse: warehouse._id }) ||
    await Order.exists({ "items.warehouse": warehouse._id }) ||
    await SupplyRequest.exists({ "items.warehouse": warehouse._id });
  if (hasStockHistory) {
    throw new ApiError(409, "Warehouses referenced by inventory or records cannot be deleted.");
  }
  if (warehouse.manager) {
    await User.updateOne(
      { _id: warehouse.manager },
      { $pull: { assignedWarehouses: warehouse._id } }
    );
  }
  await warehouse.deleteOne();
  res.json({ success: true, message: "Warehouse deleted." });
});

async function findManager(id) {
  validateObjectId(id, "manager ID");
  const manager = await User.findOne({ _id: id, role: "warehouse_manager", isActive: true });
  if (!manager) throw new ApiError(400, "The selected warehouse manager was not found or is inactive.");
  return manager;
}
