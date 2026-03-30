import express from "express";
import { requireAuth, allowRoles } from "../../middleware/auth.middlware.ts";
import { adminController } from "./admin.controller.js";

const router = express.Router();

router.get("/users", requireAuth, allowRoles("ADMIN"), adminController.getAllUsers);
router.delete("/users/:userId", requireAuth, allowRoles("ADMIN"), adminController.deleteUser);

export const AdminRoutes = router;
