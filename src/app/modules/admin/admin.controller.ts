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
  await adminService.deleteUser(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User deleted successfully",
    data: null,
  });
});

export const adminController = {
  getAllUsers,
  deleteUser,
};
