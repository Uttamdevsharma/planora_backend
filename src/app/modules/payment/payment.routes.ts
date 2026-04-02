import express from "express";
import { requireAuth } from "../../middleware/auth.middlware";
import { paymentController } from "./payment.controller.js";

const router = express.Router();

router.post("/checkout", requireAuth, paymentController.createCheckoutSession);
router.get("/verify-payment", requireAuth, paymentController.verifyPayment);
router.get("/earnings", requireAuth, paymentController.getMyEarnings);

// Webhook route - needs raw body
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);

export const PaymentRoutes = router;
