import { Role } from "../../generated/prisma/index.js";

export interface JwtPayload {
    userId: string,
    role: keyof typeof Role
}