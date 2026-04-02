import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { eventService } from "./event.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { EventValidation } from "./event.validation";

const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const payload = req.body;

  if (req.file) {
    payload.imageUrl = (req.file as any).path;
  }

  // Parse numeric fee if it comes as string from form-data
  if (typeof payload.fee === 'string') {
      const parsedFee = parseFloat(payload.fee);
      payload.fee = isNaN(parsedFee) ? 0 : parsedFee;
  }
  
  // Parse boolean isPublic
  if (typeof payload.isPublic === 'string') {
      payload.isPublic = payload.isPublic === 'true';
  }

  const validatedData = EventValidation.createEventSchema.parse(payload);
  
  // Explicitly pick fields for Prisma to avoid "Database request error" from extra fields
  const eventData = {
    title: validatedData.title,
    description: validatedData.description,
    date: validatedData.date,
    time: validatedData.time,
    venue: validatedData.venue,
    meetingLink: validatedData.meetingLink || null,
    type: validatedData.type,
    isPublic: validatedData.isPublic,
    fee: validatedData.fee,
    imageUrl: validatedData.imageUrl || null,
  };

  const result = await eventService.createEvent(userId as string, eventData);

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
    const parsedFee = parseFloat(payload.fee);
    payload.fee = isNaN(parsedFee) ? 0 : parsedFee;
  }
  
  if (typeof payload.isPublic === 'string') {
      payload.isPublic = payload.isPublic === 'true';
  }

  const validatedData = EventValidation.updateEventSchema.parse(payload);
  
  // Explicitly pick fields for Prisma to avoid "Database request error" from extra fields
  const eventData: any = {};
  const fields = ['title', 'description', 'date', 'time', 'venue', 'meetingLink', 'type', 'isPublic', 'fee', 'imageUrl'];
  
  fields.forEach(field => {
    if ((validatedData as any)[field] !== undefined) {
      eventData[field] = (validatedData as any)[field];
    }
  });

  const result = await eventService.updateEvent(userId as string, eventId as string, eventData);

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

  await eventService.deleteEvent(userId as string, eventId as string);

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

  const result = await eventService.getEventById(eventId as string, userId);

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
  const result = await eventService.updateFeaturedEvent(eventId as string);

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
