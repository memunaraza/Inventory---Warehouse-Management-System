import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
});

const orderSchema = new mongoose.Schema({
  salesRepresentative: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  customer: {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { type: String, trim: true, maxlength: 40 }
  },
  items: { type: [orderItemSchema], required: true, validate: [(items) => items.length > 0, "An order requires at least one item."] },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Completed", "Cancelled"],
    default: "Pending",
    required: true
  }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
