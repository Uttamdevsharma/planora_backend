import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { userService } from "./user.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const user = await userService.getMyProfile(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: user,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const payload = req.body;

  if (req.file) {
    payload.image = (req.file as any).path;
  }

  const user = await userService.updateProfile(userId as string, payload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await userService.getDashboardStats(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const payload = req.body;

  await userService.changePassword(userId as string, payload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});

export const userController = {
  getMyProfile,
  updateProfile,
  getDashboardStats,
  changePassword,
};
