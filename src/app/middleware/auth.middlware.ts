import { Request, Response, NextFunction } from "express"
import { JwtPayload } from "../types/jwt.types"
import jwt from 'jsonwebtoken'
import { Role } from "../../generated/prisma/enums"
import { AppError } from "../errorHelpers/AppError"
import { envVars } from "../config/env"


//authentication
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  
  const header = req.headers.authorization

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication token missing"))
  }

  const token = header.split(" ")[1]

  try {
    const decoded = jwt.verify(token, envVars.AUTH_SECRET) as JwtPayload

    req.user = {
      userId: decoded.userId,
      role: decoded.role
    }

    next()

  } catch (error) {
    return next(new AppError(401, "Invalid or expired token"))
  }
}



// authorization
export const allowRoles = (...allowedRoles: (keyof typeof Role)[]) => {

  return (req: Request, res: Response, next: NextFunction) => {

    if (!req.user) {
      return next(new AppError(401, "Unauthorized access"))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, "You are not permitted to access this resource")
      )
    }

    next()
  }
}