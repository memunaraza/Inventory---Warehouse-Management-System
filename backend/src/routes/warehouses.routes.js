import { Router } from "express";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  listWarehouses,
  updateWarehouse
} from "../controllers/warehouses.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", authorize("admin", "warehouse_manager", "supplier", "sales_representative"), listWarehouses);
router.get("/:id", authorize("admin", "warehouse_manager", "supplier", "sales_representative"), getWarehouse);
router.post("/", authorize("admin"), createWarehouse);
router.put("/:id", authorize("admin"), updateWarehouse);
router.delete("/:id", authorize("admin"), deleteWarehouse);

export default router;
