import { Role } from "../../generated/prisma/enums";

export interface JwtPayload {
    userId: string,
    role: keyof typeof Role
}