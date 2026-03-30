import express from "express";
import { requireAuth } from "../../middleware/auth.middlware.ts";
import { invitationController } from "./invitation.controller.js";

const router = express.Router();

router.post("/send", requireAuth, invitationController.sendInvitation);
router.patch("/:invitationId/respond", requireAuth, invitationController.respondToInvitation);
router.get("/my-invitations", requireAuth, invitationController.getMyInvitations);

export const InvitationRoutes = router;
