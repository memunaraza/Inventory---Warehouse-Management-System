import { Router } from "express";
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus
} from "../controllers/orders.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.post("/", authorize("admin", "sales_representative"), createOrder);
router.get("/", authorize("admin", "warehouse_manager", "sales_representative"), listOrders);
router.get("/:id", authorize("admin", "warehouse_manager", "sales_representative"), getOrder);
router.put("/:id/status", authorize("admin", "warehouse_manager", "sales_representative"), updateOrderStatus);

export default router;
