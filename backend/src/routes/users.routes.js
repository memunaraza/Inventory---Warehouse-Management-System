import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateOwnProfile,
  updateUser
} from "../controllers/users.controller.js";
import { currentUser } from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/me", currentUser);
router.put("/me", updateOwnProfile);
router.get("/", authorize("admin"), listUsers);
router.post("/", authorize("admin"), createUser);
router.get("/:id", authorize("admin"), getUser);
router.put("/:id", authorize("admin"), updateUser);
router.delete("/:id", authorize("admin"), deleteUser);

export default router;
