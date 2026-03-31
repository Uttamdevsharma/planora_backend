import express from "express";
import { requireAuth, allowRoles } from "../../middleware/auth.middlware";
import { adminController } from "./admin.controller";

const router = express.Router();

router.get("/users", requireAuth, allowRoles("ADMIN"), adminController.getAllUsers);
router.delete("/users/:userId", requireAuth, allowRoles("ADMIN"), adminController.deleteUser);
router.get("/events", requireAuth, allowRoles("ADMIN"), adminController.getAllEvents);
router.delete("/events/:eventId", requireAuth, allowRoles("ADMIN"), adminController.deleteEvent);
router.patch("/events/:eventId/feature", requireAuth, allowRoles("ADMIN"), adminController.toggleFeaturedEvent);
router.get("/stats", requireAuth, allowRoles("ADMIN"), adminController.getDashboardStats);

export const AdminRoutes = router;
