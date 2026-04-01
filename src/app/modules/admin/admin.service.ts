import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });
  return users;
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await prisma.user.delete({ where: { id: userId } });
  return null;
};

const getAllEvents = async () => {
  const events = await prisma.event.findMany({
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return events;
};

const deleteEvent = async (eventId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  await prisma.event.delete({ where: { id: eventId } });
  return null;
};

const getDashboardStats = async () => {
  const totalUsers = await prisma.user.count();
  const totalEvents = await prisma.event.count();
  const totalParticipants = await prisma.participant.count({
    where: { status: 'APPROVED' }
  });
  const totalEarnings = await prisma.earnings.aggregate({
    _sum: {
      amount: true,
      platformFee: true,
    },
  });

  return {
    totalUsers,
    totalEvents,
    totalParticipants,
    platformRevenue: totalEarnings._sum.platformFee || 0,
    totalEarnings: totalEarnings._sum.amount || 0,
  };
};

const toggleFeaturedEvent = async (eventId: string, isFeatured: boolean) => {
  if (isFeatured) {
    // Check if any other event is already featured
    const existingFeatured = await prisma.event.findFirst({
      where: { isFeatured: true }
    });
    if (existingFeatured && existingFeatured.id !== eventId) {
      throw new AppError(status.BAD_REQUEST, "A featured event already exists. Remove it before adding a new one.");
    }
  }

  const result = await prisma.event.update({
    where: { id: eventId },
    data: { isFeatured }
  });

  return result;
};

export const adminService = {
  getAllUsers,
  deleteUser,
  getAllEvents,
  deleteEvent,
  getDashboardStats,
  toggleFeaturedEvent
};
