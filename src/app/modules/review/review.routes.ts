import express from "express";
import { requireAuth } from "../../middleware/auth.middlware.ts";
import { reviewController } from "./review.controller";

const router = express.Router();

router.post("/", requireAuth, reviewController.createReview);
router.patch("/:reviewId", requireAuth, reviewController.updateReview);
router.delete("/:reviewId", requireAuth, reviewController.deleteReview);
router.get("/my-reviews", requireAuth, reviewController.getMyReviews);

export const ReviewRoutes = router;
