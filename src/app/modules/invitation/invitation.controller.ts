import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { invitationService } from "./invitation.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const sendInvitation = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user?.userId;
  const payload = req.body;

  const result = await invitationService.sendInvitation(senderId as string, payload);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Invitation sent successfully",
    data: result,
  });
});

const respondToInvitation = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { invitationId } = req.params;
  const { status: response } = req.body;

  const result = await invitationService.respondToInvitation(userId as string, invitationId, response);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invitation status updated successfully",
    data: result,
  });
});

const getMyInvitations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await invitationService.getMyInvitations(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My invitations retrieved successfully",
    data: result,
  });
});

export const invitationController = {
  sendInvitation,
  respondToInvitation,
  getMyInvitations,
};
