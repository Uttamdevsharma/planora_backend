import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router()

router.post("/register",authController.userRegister)
router.post("/login",authController.userLogin)


export const authRoutes = router