import { Router } from "express";
import {
  createSupplyRequest,
  getSupplyRequest,
  listSupplyRequests,
  reviewSupplyRequest
} from "../controllers/supply-requests.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.post("/", authorize("supplier"), createSupplyRequest);
router.get("/", authorize("admin", "supplier"), listSupplyRequests);
router.get("/:id", authorize("admin", "supplier"), getSupplyRequest);
router.put("/:id/review", authorize("admin"), reviewSupplyRequest);

export default router;
