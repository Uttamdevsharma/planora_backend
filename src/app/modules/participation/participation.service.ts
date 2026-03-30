import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";
import { ParticipationStatus, PaymentStatus } from "../../../generated/prisma/enums";

const joinEvent = async (userId: string, eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  const existingParticipation = await prisma.participant.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (existingParticipation) {
    throw new AppError(status.BAD_REQUEST, "You are already a participant or have a pending request");
  }

  // Logic:
  // Free Public: APPROVED instantly
  // Paid Public: PENDING until payment
  // Free Private: PENDING until owner approval
  // Paid Private: PENDING until payment AND owner approval

  let initialStatus: ParticipationStatus = ParticipationStatus.PENDING;

  if (event.isPublic && event.fee === 0) {
    initialStatus = ParticipationStatus.APPROVED;
  }

  const participant = await prisma.participant.create({
    data: {
      userId,
      eventId,
      status: initialStatus,
      paymentStatus: event.fee > 0 ? PaymentStatus.UNPAID : PaymentStatus.PAID,
    },
  });

  return participant;
};

const updateParticipationStatus = async (ownerId: string, participantId: string, statusPayload: ParticipationStatus) => {
  const participation = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { event: true },
  });

  if (!participation) {
    throw new AppError(status.NOT_FOUND, "Participation record not found");
  }

  if (participation.event.creatorId !== ownerId) {
    throw new AppError(status.FORBIDDEN, "Only the event creator can manage participants");
  }

  const updated = await prisma.participant.update({
    where: { id: participantId },
    data: { status: statusPayload },
  });

  return updated;
};

const getEventParticipants = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  if (event.creatorId !== ownerId) {
      // Check if it's admin?
      const user = await prisma.user.findUnique({where:{id:ownerId}});
      if(user?.role !== 'ADMIN') {
          throw new AppError(status.FORBIDDEN, "Only the event creator or admin can view all participants");
      }
  }

  const participants = await prisma.participant.findMany({
    where: { eventId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return participants;
};

const getMyParticipations = async (userId: string) => {
    const participations = await prisma.participant.findMany({
        where: { userId },
        include: {
            event: {
                include: {
                    creator: { select: { id: true, name: true } }
                }
            }
        }
    });
    return participations;
}

export const participationService = {
  joinEvent,
  updateParticipationStatus,
  getEventParticipants,
  getMyParticipations
};
