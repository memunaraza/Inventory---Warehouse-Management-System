import { Router } from "express";
import { listTransactions } from "../controllers/transactions.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, authorize("admin", "warehouse_manager"));
router.get("/", listTransactions);

export default router;
