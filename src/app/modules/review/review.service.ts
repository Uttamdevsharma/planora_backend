import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";

const createReview = async (userId: string, payload: { eventId: string; rating: number; comment: string }) => {
  const participation = await prisma.participant.findUnique({
    where: { userId_eventId: { userId, eventId: payload.eventId } },
  });

  if (!participation || participation.status !== "APPROVED") {
    throw new AppError(status.FORBIDDEN, "Only approved participants can review events");
  }

  const review = await prisma.review.create({
    data: {
      userId,
      eventId: payload.eventId,
      rating: payload.rating,
      comment: payload.comment,
    },
  });

  return review;
};

const updateReview = async (userId: string, reviewId: string, payload: { rating?: number; comment?: string }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only update your own reviews");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: payload,
  });

  return updated;
};

const deleteReview = async (userId: string, reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  const user = await prisma.user.findUnique({where: {id: userId}});
  if (review.userId !== userId && user?.role !== 'ADMIN') {
    throw new AppError(status.FORBIDDEN, "You can only delete your own reviews");
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  return null;
};

const getMyReviews = async (userId: string) => {
    const reviews = await prisma.review.findMany({
        where: { userId },
        include: {
            event: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return reviews;
}

export const reviewService = {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews
};
