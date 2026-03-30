import express from "express";
import { requireAuth } from "../../middleware/auth.middlware.ts";
import { userController } from "./user.controller";
import { upload } from "../../middleware/upload/cloudinary";

const router = express.Router();

router.get("/me", requireAuth, userController.getMyProfile);
router.patch("/me", requireAuth, upload.single("image"), userController.updateProfile);

export const UserRoutes = router;
