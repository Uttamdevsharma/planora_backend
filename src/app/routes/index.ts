import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { UserRoutes } from "../modules/user/user.routes";
import { EventRoutes } from "../modules/event/event.routes";
import { ParticipationRoutes } from "../modules/participation/participation.routes";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { InvitationRoutes } from "../modules/invitation/invitation.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";

const router = Router();

const moduleRoutes = [
  { path: "/auth", route: authRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/events", route: EventRoutes },
  { path: "/participations", route: ParticipationRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/invitations", route: InvitationRoutes },
  { path: "/reviews", route: ReviewRoutes },
  { path: "/admin", route: AdminRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export const indexRoutes = router;
