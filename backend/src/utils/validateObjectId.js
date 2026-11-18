import mongoose from "mongoose";
import ApiError from "./ApiError.js";

export default function validateObjectId(value, label = "ID") {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label}.`);
  }
}
