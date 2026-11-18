import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  type: { type: String, enum: ["in", "out"], required: true },
  quantity: { type: Number, required: true, min: 1 },
  reason: { type: String, trim: true, maxlength: 500 },
  reference: { type: mongoose.Schema.Types.ObjectId },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

stockTransactionSchema.index({ warehouse: 1, createdAt: -1 });

export default mongoose.model("StockTransaction", stockTransactionSchema);
