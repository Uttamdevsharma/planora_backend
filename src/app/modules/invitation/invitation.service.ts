import httpStatus from 'http-status';
import { PrismaClient, Invitation, InvitationStatus, EventType } from '../../../generated/prisma/index.js';

import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errorHelpers/AppError.js';
import { paymentService } from '../payment/payment.service.js';

const sendInvitation = async (
  senderId: string,
  eventId: string,
  receiverId: string
): Promise<Invitation> => {
  // Check if sender is the event creator
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event || event.creatorId !== senderId) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only the event creator can send invitations.');
  }

  // Check if receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
  });

  if (!receiver) {
    throw new AppError(httpStatus.NOT_FOUND, 'Receiver user not found.');
  }

  // Check if an invitation already exists
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      eventId,
      senderId,
      receiverId,
    },
  });

  if (existingInvitation) {
    throw new AppError(httpStatus.CONFLICT, 'Invitation already sent to this user for this event.');
  }

  const invitation = await prisma.invitation.create({
    data: {
      eventId,
      senderId,
      receiverId,
      status: InvitationStatus.PENDING,
    },
  });
  return invitation;
};

const getInvitations = async (userId: string): Promise<Invitation[]> => {
  const invitations = await prisma.invitation.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          venue: true,
          imageUrl: true,
          fee: true,
          type: true,
        },
      },
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  return invitations;
};

const updateInvitationStatus = async (
  invitationId: string,
  userId: string,
  status: InvitationStatus
): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.receiverId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Invitation not found or you are not the receiver.'
    );
  }

  if (status === InvitationStatus.ACCEPTED) {
    // For free events, directly accept
    const event = await prisma.event.findUnique({ where: { id: invitation.eventId } });
    if (event?.fee === 0) {
      await prisma.participant.create({
        data: {
          eventId: invitation.eventId,
          userId: invitation.receiverId,
          status: 'APPROVED', // Assuming direct approval for free invited participants
        },
      });
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Cannot accept a paid event invitation without payment.'
      );
    }
  }

  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status },
  });
  return updatedInvitation;
};

const payAndAcceptInvitation = async (
  invitationId: string,
  userId: string
): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });

  if (!invitation || invitation.receiverId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Invitation not found or you are not the receiver.'
    );
  }

  if (invitation.event.fee === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This is a free event, no payment needed. Use accept invitation instead.'
    );
  }

  // Create Stripe checkout session
  const session = await paymentService.createCheckoutSession(userId, invitation.eventId, invitationId);

  return { url: session.url } as any;
};

const searchUsers = async (searchTerm: string, excludeUserId: string, eventId?: string) => {
  const where: any = {
    AND: [
      { id: { not: excludeUserId } },
      { role: { not: 'ADMIN' } },
    ],
  };

  if (searchTerm) {
    where.AND.push({
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  if (eventId) {
    where.AND.push({
      participants: {
        none: { eventId },
      },
    });
    where.AND.push({
      receivedInvitations: {
        none: { 
          eventId,
          status: { in: ['PENDING', 'ACCEPTED'] }
        },
      },
    });
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  // LOGGING FOR DEBUGGING
  try {
    const fs = await import('fs');
    fs.appendFileSync('tmp/search_log.txt', `[${new Date().toISOString()}] eventId: ${eventId} | searchTerm: "${searchTerm}" | count: ${users.length} | userIds: ${users.map(u => u.id).join(', ')}\n`);
  } catch (err) {}

  return users;
};

export const InvitationService = {
  sendInvitation,
  getInvitations,
  updateInvitationStatus,
  payAndAcceptInvitation,
  searchUsers,
};
