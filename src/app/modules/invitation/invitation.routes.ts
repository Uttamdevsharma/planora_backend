import express from 'express';
import { InvitationController } from './invitation.controller.js';
import { requireAuth, allowRoles } from "../../middleware/auth.middlware";
import { Role } from "@prisma/client";

const router = express.Router();

router.post(
  '/',
  requireAuth,
  allowRoles(Role.ADMIN, Role.USER), // Only event creator can send, but they can be ADMIN or USER
  InvitationController.sendInvitation
);

router.get(
  '/',
  requireAuth,
  InvitationController.getInvitations
);

router.patch(
  '/:invitationId/status',
  requireAuth,
  InvitationController.updateInvitationStatus
);

router.patch(
  '/:invitationId/pay-accept',
  requireAuth,
  InvitationController.payAndAcceptInvitation
);

router.get(
  '/search-users',
  requireAuth,
  InvitationController.searchUsers
);

export const InvitationRoutes = router;
