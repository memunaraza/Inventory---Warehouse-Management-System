import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import productsRoutes from "./routes/products.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import supplyRequestsRoutes from "./routes/supply-requests.routes.js";
import transactionsRoutes from "./routes/transactions.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import usersRoutes from "./routes/users.routes.js";
import warehousesRoutes from "./routes/warehouses.routes.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import ApiError from "./utils/ApiError.js";

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === "production"
  ? []
  : ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = new Set([...configuredOrigins, ...developmentOrigins]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new ApiError(403, "Origin is not allowed by CORS."));
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Inventory API is running." });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/warehouses", warehousesRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/supply-requests", supplyRequestsRoutes);
app.use("/api/upload", uploadRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
