import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { paymentService } from "./payment.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { eventId } = req.body;

  const session = await paymentService.createCheckoutSession(userId as string, eventId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Checkout session created",
    data: { url: session.url },
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const payload = (req as any).rawBody || req.body; // Needs rawBody for webhook

  const result = await paymentService.handleWebhook(sig, payload);
  res.status(status.OK).json(result);
});

const getMyEarnings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await paymentService.getMyEarnings(userId as string);
  
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "My earnings retrieved successfully",
      data: result,
    });
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { session_id } = req.query;
  const result = await paymentService.verifyPayment(session_id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment verified and participation created",
    data: result,
  });
});

export const paymentController = {
  createCheckoutSession,
  handleWebhook,
  getMyEarnings,
  verifyPayment
};
