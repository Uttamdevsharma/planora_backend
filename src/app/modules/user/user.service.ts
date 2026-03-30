import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";

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

export const userService = {
  getMyProfile,
  updateProfile,
};
