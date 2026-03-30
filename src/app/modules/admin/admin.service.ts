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

  // Deleting user might need cascade?
  // Prisma handles it if specified in schema.
  await prisma.user.delete({ where: { id: userId } });
  return null;
};

export const adminService = {
  getAllUsers,
  deleteUser,
};
