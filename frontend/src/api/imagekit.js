import api, { getApiData } from "./client.js";

export async function uploadImage(file, folder) {
  const { token, expire, signature, publicKey } = getApiData(await api.get("/upload/auth"));
  const payload = new FormData();
  payload.append("file", file);
  payload.append("fileName", file.name);
  payload.append("publicKey", publicKey);
  payload.append("token", token);
  payload.append("expire", String(expire));
  payload.append("signature", signature);
  if (folder) payload.append("folder", folder);

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: payload
  });
  const result = await response.json();
  if (!response.ok || !result.url || !result.fileId) {
    throw new Error(result.message || "ImageKit could not upload this image.");
  }
  return { url: result.url, fileId: result.fileId };
}
