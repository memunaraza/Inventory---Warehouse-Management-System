import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  sku: { type: String, required: true, trim: true, uppercase: true },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  price: { type: Number, required: true, min: 0 },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lowStockLimit: { type: Number, required: true, min: 0, default: 0 },
  image: {
    url: { type: String, trim: true },
    fileId: { type: String, trim: true }
  },
  description: { type: String, trim: true, maxlength: 2000 }
}, { timestamps: true });

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: "text", category: "text" });

export default mongoose.model("Product", productSchema);
