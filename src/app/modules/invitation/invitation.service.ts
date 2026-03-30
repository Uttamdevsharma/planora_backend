import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";
import { InvitationStatus, ParticipationStatus, PaymentStatus } from "../../../generated/prisma/enums";

const sendInvitation = async (senderId: string, payload: { eventId: string; receiverEmail: string }) => {
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  if (event.creatorId !== senderId) {
    throw new AppError(status.FORBIDDEN, "Only the event creator can send invitations");
  }

  const receiver = await prisma.user.findUnique({
    where: { email: payload.receiverEmail },
  });

  if (!receiver) {
    throw new AppError(status.NOT_FOUND, "Receiver user not found");
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      eventId: payload.eventId,
      receiverId: receiver.id,
      status: InvitationStatus.PENDING,
    },
  });

  if (existingInvitation) {
    throw new AppError(status.BAD_REQUEST, "An invitation is already pending for this user");
  }

  const invitation = await prisma.invitation.create({
    data: {
      eventId: payload.eventId,
      senderId,
      receiverId: receiver.id,
    },
  });

  return invitation;
};

const respondToInvitation = async (userId: string, invitationId: string, response: InvitationStatus) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });

  if (!invitation) {
    throw new AppError(status.NOT_FOUND, "Invitation not found");
  }

  if (invitation.receiverId !== userId) {
    throw new AppError(status.FORBIDDEN, "You are not the recipient of this invitation");
  }

  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: response },
  });

  if (response === InvitationStatus.ACCEPTED) {
    // Check if event is free or paid
    // If free, approve instantly. If paid, they might need to pay later?
    // Requirement says: "Pay & Accept (for paid events). After payment: Status becomes Pending approval"
    // For now, if accepted, we create a participant record.
    
    await prisma.participant.upsert({
        where: { userId_eventId: { userId, eventId: invitation.eventId } },
        update: {},
        create: {
            userId,
            eventId: invitation.eventId,
            status: invitation.event.fee === 0 ? ParticipationStatus.APPROVED : ParticipationStatus.PENDING,
            paymentStatus: invitation.event.fee === 0 ? PaymentStatus.PAID : PaymentStatus.UNPAID
        }
    });
  }

  return updatedInvitation;
};

const getMyInvitations = async (userId: string) => {
  const invitations = await prisma.invitation.findMany({
    where: { receiverId: userId },
    include: {
      event: {
        include: {
          creator: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
};

export const invitationService = {
  sendInvitation,
  respondToInvitation,
  getMyInvitations,
};
