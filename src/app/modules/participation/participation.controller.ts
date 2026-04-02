import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { participationService } from "./participation.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { eventId } = req.body;

  const result = await participationService.joinEvent(userId as string, eventId);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Participation request submitted successfully",
    data: result,
  });
});

const updateParticipationStatus = catchAsync(async (req: Request, res: Response) => {
  const ownerId = req.user?.userId;
  const { participantId } = req.params;
  const { status: statusPayload } = req.body;

  const result = await participationService.updateParticipationStatus(ownerId as string, participantId as string, statusPayload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Participant status updated successfully",
    data: result,
  });
});

const getEventParticipants = catchAsync(async (req: Request, res: Response) => {
  const ownerId = req.user?.userId;
  const { eventId } = req.params;

  const result = await participationService.getEventParticipants(ownerId as string, eventId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event participants retrieved successfully",
    data: result,
  });
});

const getMyParticipations = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await participationService.getMyParticipations(userId as string);
  
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "My participations retrieved successfully",
      data: result,
    });
});

export const participationController = {
  joinEvent,
  updateParticipationStatus,
  getEventParticipants,
  getMyParticipations
};
