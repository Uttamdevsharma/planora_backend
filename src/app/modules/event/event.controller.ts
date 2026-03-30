import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { eventService } from "./event.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const payload = req.body;

  if (req.file) {
    payload.imageUrl = (req.file as any).path;
  }

  // Parse numeric fee if it comes as string from form-data
  if (typeof payload.fee === 'string') {
      payload.fee = parseFloat(payload.fee);
  }
  
  // Parse boolean isPublic
  if (typeof payload.isPublic === 'string') {
      payload.isPublic = payload.isPublic === 'true';
  }

  const result = await eventService.createEvent(userId as string, payload);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Event created successfully",
    data: result,
  });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { eventId } = req.params;
  const payload = req.body;

  if (req.file) {
    payload.imageUrl = (req.file as any).path;
  }

  if (typeof payload.fee === 'string') {
    payload.fee = parseFloat(payload.fee);
  }
  
  if (typeof payload.isPublic === 'string') {
      payload.isPublic = payload.isPublic === 'true';
  }

  const result = await eventService.updateEvent(userId as string, eventId, payload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event updated successfully",
    data: result,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { eventId } = req.params;

  await eventService.deleteEvent(userId as string, eventId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event deleted successfully",
    data: null,
  });
});

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const result = await eventService.getAllEvents(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Events retrieved successfully",
    data: result,
  });
});

const getEventById = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.userId; // Optional userId for checking participation status

  const result = await eventService.getEventById(eventId, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event retrieved successfully",
    data: result,
  });
});

const getFeaturedEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.getFeaturedEvent();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Featured event retrieved successfully",
    data: result,
  });
});

const getUpcomingEvents = catchAsync(async (req: Request, res: Response) => {
    const result = await eventService.getUpcomingEvents();
  
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Upcoming events retrieved successfully",
      data: result,
    });
});

const updateFeaturedEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const result = await eventService.updateFeaturedEvent(eventId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event featured updated successfully",
    data: result,
  });
});

export const eventController = {
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  getFeaturedEvent,
  updateFeaturedEvent,
  getUpcomingEvents
};
