import { getUploadAuthentication } from "../services/imagekit.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const uploadAuthentication = asyncHandler(async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ success: true, data: getUploadAuthentication() });
});
