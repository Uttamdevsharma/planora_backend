import express from "express";
import { aiController } from "./ai.controller";
import { requireAuth } from "../../middleware/auth.middlware";

const router = express.Router();

// POST /ai/generate-description — protected (only logged-in users can generate)
router.post("/generate-description", requireAuth, aiController.generateDescription);

// POST /ai/chat — public (anyone can use the chat assistant)
router.post("/chat", aiController.chat);

export const AiRoutes = router;
