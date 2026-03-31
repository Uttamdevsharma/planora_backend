import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { adminService } from "./admin.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllUsers();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All users retrieved successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  await adminService.deleteUser(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User deleted successfully",
    data: null,
  });
});

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllEvents();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All events retrieved successfully",
    data: result,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  await adminService.deleteEvent(eventId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event deleted successfully",
    data: null,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getDashboardStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result,
  });
});

const toggleFeaturedEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { isFeatured } = req.body;
  const result = await adminService.toggleFeaturedEvent(eventId as string, isFeatured as boolean);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event featured status updated successfully",
    data: result,
  });
});

export const adminController = {
  getAllUsers,
  deleteUser,
  getAllEvents,
  deleteEvent,
  getDashboardStats,
  toggleFeaturedEvent
};
