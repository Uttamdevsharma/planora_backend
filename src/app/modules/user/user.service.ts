import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";
import bcrypt from "bcrypt";

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const updateProfile = async (userId: string, payload: { name?: string; image?: string }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

const getDashboardStats = async (userId: string) => {
  const totalEvents = await prisma.event.count({
    where: { creatorId: userId },
  });

  const totalParticipants = await prisma.participant.count({
    where: {
      event: { creatorId: userId },
      status: 'APPROVED',
    },
  });

  const earnings = await prisma.earnings.aggregate({
    where: { creatorId: userId },
    _sum: { amount: true },
  });

  const pendingInvitations = await prisma.invitation.count({
    where: {
      receiverId: userId,
      status: 'PENDING',
    },
  });

  return {
    totalEvents,
    totalParticipants,
    totalEarnings: earnings._sum.amount || 0,
    pendingInvitations,
  };
};

const changePassword = async (userId: string, payload: any) => {
  const { oldPassword, newPassword } = payload;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    throw new AppError(status.BAD_REQUEST, "Old password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return null;
};

export const userService = {
  getMyProfile,
  updateProfile,
  getDashboardStats,
  changePassword,
};
