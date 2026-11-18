import { Router } from "express";
import { uploadAuthentication } from "../controllers/upload.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/auth", authenticate, uploadAuthentication);

export default router;
