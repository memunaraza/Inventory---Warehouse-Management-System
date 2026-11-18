import { createHmac, randomUUID } from "node:crypto";
import ApiError from "../utils/ApiError.js";

export function getUploadAuthentication() {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new ApiError(503, "Image uploads are not configured.");
  }
  let endpoint;
  try {
    endpoint = new URL(IMAGEKIT_URL_ENDPOINT);
  } catch {
    throw new ApiError(503, "ImageKit URL endpoint is not configured correctly.");
  }
  if (endpoint.protocol !== "https:") {
    throw new ApiError(503, "ImageKit URL endpoint must use HTTPS.");
  }
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = createHmac("sha1", IMAGEKIT_PRIVATE_KEY)
    .update(token + expire)
    .digest("hex");
  return {
    token,
    expire,
    signature,
    publicKey: IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: endpoint.toString().replace(/\/$/, "")
  };
}
