import mongoose from "mongoose";

const supplyRequestItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const supplyRequestSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: {
    type: [supplyRequestItemSchema],
    required: true,
    validate: [(items) => items.length > 0, "A supply request requires at least one item."]
  },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewNote: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

export default mongoose.model("SupplyRequest", supplyRequestSchema);
