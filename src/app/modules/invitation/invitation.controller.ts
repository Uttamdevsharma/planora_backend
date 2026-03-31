import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { InvitationService } from './invitation.service.js';

const sendInvitation = catchAsync(async (req: Request, res: Response) => {
  const { eventId, receiverId } = req.body;
  const senderId = req.user?.userId as string;
  const result = await InvitationService.sendInvitation(senderId, eventId, receiverId);

  sendResponse(res, {
    httpStatusCode: httpStatus.CREATED,
    success: true,
    message: 'Invitation sent successfully',
    data: result,
  });
});

const getInvitations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await InvitationService.getInvitations(userId);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: 'Invitations fetched successfully',
    data: result,
  });
});

const updateInvitationStatus = catchAsync(async (req: Request, res: Response) => {
  const { invitationId } = req.params;
  const { status } = req.body;
  const userId = req.user?.userId as string;
  const result = await InvitationService.updateInvitationStatus(invitationId as string, userId, status);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: 'Invitation status updated successfully',
    data: result,
  });
});

const payAndAcceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const { invitationId } = req.params;
  const userId = req.user?.userId as string;
  // In a real application, payment processing would happen here
  // For now, we'll simulate payment success and accept the invitation
  const result = await InvitationService.payAndAcceptInvitation(invitationId as string, userId);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: 'Payment successful and invitation accepted',
    data: result,
  });
});

const searchUsers = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm } = req.query;
  const userId = req.user?.userId as string;
  const result = await InvitationService.searchUsers(searchTerm as string, userId);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: 'Users fetched successfully',
    data: result,
  });
});

export const InvitationController = {
  sendInvitation,
  getInvitations,
  updateInvitationStatus,
  payAndAcceptInvitation,
  searchUsers,
};
