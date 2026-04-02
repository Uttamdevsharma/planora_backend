import { Role } from "@prisma/client";

export interface JwtPayload {
    userId: string,
    role: keyof typeof Role
}