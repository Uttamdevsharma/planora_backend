import express, { Request, Response, NextFunction } from "express";
import { requireAuth, allowRoles } from "../../middleware/auth.middlware.ts";
import { eventController } from "./event.controller.js";
import { upload } from "../../middleware/upload/cloudinary";
import jwt from "jsonwebtoken";
import { envVars } from "../../config/env";
import { JwtPayload } from "../../types/jwt.types";

const router = express.Router();

// Optional auth middleware
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    try {
      const decoded = jwt.verify(token, envVars.AUTH_SECRET) as JwtPayload;
      req.user = { userId: decoded.userId, role: decoded.role };
    } catch (error) {
      // Ignore invalid token for optional auth
    }
  }
  next();
};

router.get("/", getAllEventsMiddleware); // Wrapper for public access
router.get("/featured", eventController.getFeaturedEvent);
router.get("/upcoming", eventController.getUpcomingEvents);
router.get("/:eventId", optionalAuth, eventController.getEventById);

router.post("/", requireAuth, upload.single("image"), eventController.createEvent);
router.patch("/:eventId", requireAuth, upload.single("image"), eventController.updateEvent);
router.delete("/:eventId", requireAuth, eventController.deleteEvent);

router.patch("/:eventId/feature", requireAuth, allowRoles("ADMIN"), eventController.updateFeaturedEvent);

function getAllEventsMiddleware(req: Request, res: Response, next: NextFunction) {
    eventController.getAllEvents(req, res, next);
}

export const EventRoutes = router;
