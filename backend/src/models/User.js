import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export const USER_ROLES = [
  "admin",
  "warehouse_manager",
  "supplier",
  "sales_representative"
];

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: USER_ROLES, default: "sales_representative", required: true },
  phone: { type: String, trim: true, maxlength: 40 },
  profileImage: {
    url: { type: String, trim: true },
    fileId: { type: String, trim: true }
  },
  supplierLogo: {
    url: { type: String, trim: true },
    fileId: { type: String, trim: true }
  },
  companyName: { type: String, trim: true, maxlength: 120 },
  assignedWarehouses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.pre("save", async function hashPassword() {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});
userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
