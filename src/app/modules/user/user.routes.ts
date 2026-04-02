import express from "express";
import { requireAuth } from "../../middleware/auth.middlware";
import { userController } from "./user.controller";
import { upload } from "../../middleware/upload/cloudinary";

const router = express.Router();

router.get("/me", requireAuth, userController.getMyProfile);
router.get("/stats", requireAuth, userController.getDashboardStats);
router.patch("/me", requireAuth, upload.single("image"), userController.updateProfile);
router.post("/change-password", requireAuth, userController.changePassword);

export const UserRoutes = router;
