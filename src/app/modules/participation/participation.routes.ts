import express from "express";
import { requireAuth } from "../../middleware/auth.middlware.ts";
import { participationController } from "./participation.controller.js";

const router = express.Router();

router.post("/join", requireAuth, participationController.joinEvent);
router.patch("/:participantId/status", requireAuth, participationController.updateParticipationStatus);
router.get("/event/:eventId", requireAuth, participationController.getEventParticipants);
router.get("/my-participations", requireAuth, participationController.getMyParticipations);

export const ParticipationRoutes = router;
