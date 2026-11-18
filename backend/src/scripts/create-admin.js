import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.js";
import User from "../models/User.js";

const { BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;

try {
  if (!BOOTSTRAP_ADMIN_USERNAME || !BOOTSTRAP_ADMIN_EMAIL ||
      !BOOTSTRAP_ADMIN_PASSWORD || BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    throw new Error("Set bootstrap admin username, email, and a password of at least 12 characters.");
  }
  await connectDatabase();
  if (await User.exists({ role: "admin" })) {
    throw new Error("An administrator already exists; no account was changed.");
  }
  const admin = await User.create({
    username: BOOTSTRAP_ADMIN_USERNAME,
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
    role: "admin"
  });
  console.log(`Administrator created: ${admin.email}`);
} catch (error) {
  console.error("Unable to create administrator:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
