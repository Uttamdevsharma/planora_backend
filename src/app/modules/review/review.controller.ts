import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { reviewService } from "./review.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await reviewService.createReview(userId as string, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { reviewId } = req.params;

  const result = await reviewService.updateReview(userId as string, reviewId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { reviewId } = req.params;

  await reviewService.deleteReview(userId as string, reviewId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review deleted successfully",
    data: null,
  });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await reviewService.getMyReviews(userId as string);
  
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "My reviews retrieved successfully",
      data: result,
    });
});

export const reviewController = {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews
};
