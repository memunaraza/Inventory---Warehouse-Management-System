import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

warehouseSchema.index({ code: 1 }, { unique: true });

export default mongoose.model("Warehouse", warehouseSchema);
