import { Router } from "express";
import {
  addStock,
  listStock,
  lowStockAlerts,
  removeStock
} from "../controllers/stock.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, authorize("admin", "warehouse_manager", "sales_representative"), listStock);
router.get("/low-stock", authenticate, authorize("admin", "warehouse_manager"), lowStockAlerts);
router.post("/in", authenticate, authorize("admin", "warehouse_manager"), addStock);
router.post("/out", authenticate, authorize("admin", "warehouse_manager"), removeStock);

export default router;
