import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Stock from "../models/Stock.js";
import StockTransaction from "../models/StockTransaction.js";
import SupplyRequest from "../models/SupplyRequest.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import validateObjectId from "../utils/validateObjectId.js";

function parseImage(image) {
  if (image === null) return undefined;
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    throw new ApiError(400, "Image must include an HTTPS url and ImageKit fileId.");
  }
  let url;
  try {
    url = new URL(image.url);
  } catch {
    throw new ApiError(400, "Provide a valid HTTPS image url.");
  }
  if (url.protocol !== "https:" || typeof image.fileId !== "string" || !image.fileId.trim()) {
    throw new ApiError(400, "Image must include an HTTPS url and ImageKit fileId.");
  }
  return { url: url.toString(), fileId: image.fileId.trim() };
}

export const listProducts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.supplier) {
    validateObjectId(req.query.supplier, "supplier ID");
    filter.supplier = req.query.supplier;
  }
  const products = await Product.find(filter)
    .populate("supplier", "username email companyName supplierLogo")
    .sort({ name: 1 });
  res.json({ success: true, data: { products } });
});

export const getProduct = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "product ID");
  const product = await Product.findById(req.params.id)
    .populate("supplier", "username email companyName supplierLogo");
  if (!product) throw new ApiError(404, "Product not found.");
  res.json({ success: true, data: { product } });
});

export const createProduct = asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.sku || !body.category || body.price === undefined) {
    throw new ApiError(400, "Name, SKU, category, and price are required.");
  }
  if (body.supplier) {
    validateObjectId(body.supplier, "supplier ID");
    const supplier = await User.findOne({ _id: body.supplier, role: "supplier", isActive: true });
    if (!supplier) throw new ApiError(400, "The selected supplier was not found or is inactive.");
  }
  const product = await Product.create({
    name: body.name,
    sku: body.sku,
    category: body.category,
    price: body.price,
    lowStockLimit: body.lowStockLimit ?? 0,
    supplier: body.supplier || undefined,
    description: body.description,
    image: body.image ? parseImage(body.image) : undefined
  });
  await product.populate("supplier", "username email companyName");
  res.status(201).json({ success: true, data: { product } });
});

export const updateProduct = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "product ID");
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");

  const body = req.body || {};
  for (const field of ["name", "sku", "category", "price", "lowStockLimit", "description"]) {
    if (body[field] !== undefined) product[field] = body[field];
  }
  if (body.supplier !== undefined) {
    if (body.supplier === null || body.supplier === "") {
      product.supplier = undefined;
    } else {
      validateObjectId(body.supplier, "supplier ID");
      const supplier = await User.findOne({ _id: body.supplier, role: "supplier", isActive: true });
      if (!supplier) throw new ApiError(400, "The selected supplier was not found or is inactive.");
      product.supplier = supplier._id;
    }
  }
  if (body.image !== undefined) product.image = parseImage(body.image);
  await product.save();
  await product.populate("supplier", "username email companyName");
  res.json({ success: true, data: { product } });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "product ID");
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");
  const hasHistory = await Stock.exists({ product: product._id }) ||
    await StockTransaction.exists({ product: product._id }) ||
    await Order.exists({ "items.product": product._id }) ||
    await SupplyRequest.exists({ "items.product": product._id });
  if (hasHistory) {
    throw new ApiError(409, "Products referenced by inventory or records cannot be deleted.");
  }
  await product.deleteOne();
  res.json({ success: true, message: "Product deleted." });
});
