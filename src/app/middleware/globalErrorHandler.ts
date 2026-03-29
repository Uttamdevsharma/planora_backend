import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../errorHelpers/AppError";


export const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  let statusCode = 500;
  let message = "Internal Server Error";



  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  else if (error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = "Token has expired";
  }

  else if (error instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid token";
  }

  else if (error instanceof ZodError) {
    statusCode = 400;
    message = error.issues.map(issue => issue.message).join(", ");
  }

  else if (error instanceof Prisma.PrismaClientKnownRequestError) {

    if (error.code === "P2002") {
      statusCode = 400;
      message = "Duplicate field value.";
    }

    else if (error.code === "P2003") {
      statusCode = 400;
      message = "Invalid reference ID.";
    }

    else if (error.code === "P2025") {
      statusCode = 404;
      message = "Requested record not found.";
    }

    else {
      statusCode = 400;
      message = "Database request error.";
    }
  }

  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid database input.";
  }

  else if (error instanceof Error) {
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};