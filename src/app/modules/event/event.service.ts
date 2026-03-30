import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";
import { Prisma } from "../../../generated/prisma";

const createEvent = async (userId: string, payload: any) => {
  const event = await prisma.event.create({
    data: {
      ...payload,
      creatorId: userId,
      date: new Date(payload.date),
    },
  });
  return event;
};

const updateEvent = async (userId: string, eventId: string, payload: any) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  // Check if owner or admin
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (event.creatorId !== userId && user?.role !== "ADMIN") {
    throw new AppError(status.FORBIDDEN, "You are not allowed to update this event");
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...payload,
      date: payload.date ? new Date(payload.date) : event.date,
    },
  });

  return updatedEvent;
};

const deleteEvent = async (userId: string, eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (event.creatorId !== userId && user?.role !== "ADMIN") {
    throw new AppError(status.FORBIDDEN, "You are not allowed to delete this event");
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  return null;
};

const getAllEvents = async (query: any) => {
  const { searchTerm, isPublic, feeType, type, page = 1, limit = 10 } = query;

  const where: Prisma.EventWhereInput = {};

  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { creator: { name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  if (isPublic !== undefined) {
    where.isPublic = isPublic === "true";
  }

  if (feeType) {
    if (feeType === "free") {
      where.fee = 0;
    } else if (feeType === "paid") {
      where.fee = { gt: 0 };
    }
  }

  if (type) {
    where.type = type;
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      creator: {
        select: { id: true, name: true, image: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.event.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data: events,
  };
};

const getEventById = async (eventId: string, userId?: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: {
        select: { id: true, name: true, image: true },
      },
      reviews: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  // If user is logged in, check if they are already a participant
  let participationStatus = null;
  let isParticipant = false;
  
  if (userId) {
    const participant = await prisma.participant.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });
    participationStatus = participant ? participant.status : null;
    isParticipant = participant?.status === "APPROVED";
  }

  // Hide meeting link if not owner or approved participant
  const isOwner = userId === event.creatorId;
  const result: any = { ...event, participationStatus };

  if (!isOwner && !isParticipant) {
    result.meetingLink = null;
  }

  return result;
};

const getFeaturedEvent = async () => {
  let event = await prisma.event.findFirst({
    where: { isFeatured: true },
    include: {
      creator: { select: { id: true, name: true, image: true } },
    },
  });

  if (!event) {
    // Fallback: Latest event
    event = await prisma.event.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, image: true } },
      },
    });
  }

  return event;
};

const updateFeaturedEvent = async (eventId: string) => {
  // Un-feature all first
  await prisma.event.updateMany({
    data: { isFeatured: false },
  });

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { isFeatured: true },
  });

  return event;
};

const getUpcomingEvents = async () => {
    const events = await prisma.event.findMany({
      where: {
          isPublic: true,
          date: { gte: new Date() }
      },
      take: 9,
      orderBy: { date: 'asc' },
      include: {
          creator: { select: { id: true, name: true, image: true } }
      }
    });
    return events;
}

export const eventService = {
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  getFeaturedEvent,
  updateFeaturedEvent,
  getUpcomingEvents
};
