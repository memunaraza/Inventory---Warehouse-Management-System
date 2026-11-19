import { Router } from "express";
import { uploadAuthentication } from "../controllers/upload.controller.js";

const router = Router();

router.get("/auth", uploadAuthentication);

export default router;
