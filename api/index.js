// src/app/config/env.ts
import dotenv from "dotenv";
import status from "http-status";

// src/app/errorHelpers/AppError.ts
var AppError = class extends Error {
  statusCode;
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
};

// src/app/config/env.ts
dotenv.config();
var loadEnvVariables = () => {
  const requiredEnvVariables = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "AUTH_SECRET",
    // Cloudinary
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    // Stripe
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "FRONTEND_URL"
  ];
  requiredEnvVariables.forEach((variable) => {
    if (!process.env[variable]) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Environment variable ${variable} is required but not set in .env file.`
      );
    }
  });
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL
  };
};
var envVars = loadEnvVariables();

// src/app.ts
import express8 from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

// src/app/middleware/notFound.ts
import status2 from "http-status";
var notFound = (req, res) => {
  res.status(status2.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} Not Found`
  });
};

// src/app/middleware/globalErrorHandler.ts
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
var globalErrorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = "Token has expired";
  } else if (error instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid token";
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = error.issues.map((issue) => issue.message).join(", ");
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 400;
      message = "Duplicate field value.";
    } else if (error.code === "P2003") {
      statusCode = 400;
      message = "Invalid reference ID.";
    } else if (error.code === "P2025") {
      statusCode = 404;
      message = "Requested record not found.";
    } else {
      statusCode = 400;
      message = error.message || "Database request error.";
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid database input.";
  } else if (error instanceof Error) {
    message = error.message;
  }
  res.status(statusCode).json({
    success: false,
    message
  });
};

// src/app/routes/index.ts
import { Router as Router2 } from "express";

// src/app/modules/auth/auth.routes.ts
import { Router } from "express";

// src/app/shared/catchAsync.ts
var catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

// src/app/modules/auth/auth.validation.ts
import { z } from "zod";
var registerSchema = z.object({
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters long").max(50, "Name is too long"),
  email: z.string().min(1, "Email is required").pipe(z.email("Please provide a valid email address")),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters long")
});
var loginSchema = z.object({
  email: z.string().min(1, "Email is required").pipe(z.email("Please provide a valid email address")),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters long")
});
var AuthValidation = {
  registerSchema,
  loginSchema
};

// src/app/lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
var connectionString = `${process.env.DATABASE_URL}`;
var adapter = new PrismaPg({ connectionString });
var prisma = new PrismaClient({ adapter });

// src/app/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt2 from "jsonwebtoken";
var userRegister = async (payload) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email }
  });
  if (existingUser) {
    throw new AppError(400, "Email already in use");
  }
  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const newUser = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword
    }
  });
  const token = jwt2.sign(
    { userId: newUser.id, role: newUser.role },
    envVars.AUTH_SECRET,
    { expiresIn: "7d" }
  );
  return {
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  };
};
var userLogin = async (payload) => {
  const foundUser = await prisma.user.findUnique({
    where: { email: payload.email }
  });
  if (!foundUser) {
    throw new AppError(401, "Invalid credentials");
  }
  const passwordMatch = await bcrypt.compare(
    payload.password,
    foundUser.password
  );
  if (!passwordMatch) {
    throw new AppError(401, "Invalid credentials");
  }
  const accessToken = jwt2.sign(
    { userId: foundUser.id, role: foundUser.role },
    envVars.AUTH_SECRET,
    { expiresIn: "7d" }
  );
  return {
    token: accessToken,
    user: {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role
    }
  };
};
var authService = {
  userRegister,
  userLogin
};

// src/app/shared/sendResponse.ts
var sendResponse = (res, responseData) => {
  const { httpStatusCode, success, message, data } = responseData;
  res.status(httpStatusCode).json({
    success,
    message,
    data
  });
};

// src/app/modules/auth/auth.controller.ts
import status3 from "http-status";
var userRegister2 = catchAsync(
  async (req, res) => {
    const parseBody = AuthValidation.registerSchema.parse(req.body);
    const user = await authService.userRegister(parseBody);
    sendResponse(res, {
      httpStatusCode: status3.CREATED,
      success: true,
      message: "User created Successfully",
      data: user
    });
  }
);
var userLogin2 = catchAsync(
  async (req, res) => {
    const parseBody = AuthValidation.loginSchema.parse(req.body);
    const user = await authService.userLogin(parseBody);
    sendResponse(res, {
      httpStatusCode: status3.OK,
      success: true,
      message: "User Login Successfully",
      data: user
    });
  }
);
var authController = {
  userRegister: userRegister2,
  userLogin: userLogin2
};

// src/app/modules/auth/auth.routes.ts
var router = Router();
router.post("/register", authController.userRegister);
router.post("/login", authController.userLogin);
var authRoutes = router;

// src/app/modules/user/user.routes.ts
import express from "express";

// src/app/middleware/auth.middlware.ts
import jwt3 from "jsonwebtoken";
var requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication token missing"));
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt3.verify(token, envVars.AUTH_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (error) {
    return next(new AppError(401, "Invalid or expired token"));
  }
};
var allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Unauthorized access"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, "You are not permitted to access this resource")
      );
    }
    next();
  };
};

// src/app/modules/user/user.service.ts
import status4 from "http-status";
import bcrypt2 from "bcrypt";
var getMyProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true
    }
  });
  if (!user) {
    throw new AppError(status4.NOT_FOUND, "User not found");
  }
  return user;
};
var updateProfile = async (userId, payload) => {
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
      updatedAt: true
    }
  });
  return user;
};
var getDashboardStats = async (userId) => {
  const totalEvents = await prisma.event.count({
    where: { creatorId: userId }
  });
  const totalParticipants = await prisma.participant.count({
    where: {
      event: { creatorId: userId },
      status: "APPROVED"
    }
  });
  const earnings = await prisma.earnings.aggregate({
    where: { creatorId: userId },
    _sum: { amount: true }
  });
  const pendingInvitations = await prisma.invitation.count({
    where: {
      receiverId: userId,
      status: "PENDING"
    }
  });
  return {
    totalEvents,
    totalParticipants,
    totalEarnings: earnings._sum.amount || 0,
    pendingInvitations
  };
};
var changePassword = async (userId, payload) => {
  const { oldPassword, newPassword } = payload;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(status4.NOT_FOUND, "User not found");
  }
  const isPasswordMatch = await bcrypt2.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    throw new AppError(status4.BAD_REQUEST, "Old password is incorrect");
  }
  const hashedPassword = await bcrypt2.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
  return null;
};
var userService = {
  getMyProfile,
  updateProfile,
  getDashboardStats,
  changePassword
};

// src/app/modules/user/user.controller.ts
import status5 from "http-status";
var getMyProfile2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const user = await userService.getMyProfile(userId);
  sendResponse(res, {
    httpStatusCode: status5.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: user
  });
});
var updateProfile2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const payload = req.body;
  if (req.file) {
    payload.image = req.file.path;
  }
  const user = await userService.updateProfile(userId, payload);
  sendResponse(res, {
    httpStatusCode: status5.OK,
    success: true,
    message: "Profile updated successfully",
    data: user
  });
});
var getDashboardStats2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await userService.getDashboardStats(userId);
  sendResponse(res, {
    httpStatusCode: status5.OK,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result
  });
});
var changePassword2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const payload = req.body;
  await userService.changePassword(userId, payload);
  sendResponse(res, {
    httpStatusCode: status5.OK,
    success: true,
    message: "Password changed successfully",
    data: null
  });
});
var userController = {
  getMyProfile: getMyProfile2,
  updateProfile: updateProfile2,
  getDashboardStats: getDashboardStats2,
  changePassword: changePassword2
};

// src/app/middleware/upload/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
cloudinary.config({
  cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY_API_SECRET
});
var storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "planora",
    allowed_formats: ["jpg", "png", "jpeg"]
  }
});
var upload = multer({ storage });

// src/app/modules/user/user.routes.ts
var router2 = express.Router();
router2.get("/me", requireAuth, userController.getMyProfile);
router2.get("/stats", requireAuth, userController.getDashboardStats);
router2.patch("/me", requireAuth, upload.single("image"), userController.updateProfile);
router2.post("/change-password", requireAuth, userController.changePassword);
var UserRoutes = router2;

// src/app/modules/event/event.routes.ts
import express2 from "express";

// src/app/modules/event/event.service.ts
import status6 from "http-status";
var createEvent = async (userId, payload) => {
  const { date, ...rest } = payload;
  const event = await prisma.event.create({
    data: {
      ...rest,
      creatorId: userId,
      date: new Date(date)
    }
  });
  return event;
};
var updateEvent = async (userId, eventId, payload) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  if (!event) {
    throw new AppError(status6.NOT_FOUND, "Event not found");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (event.creatorId !== userId && user?.role !== "ADMIN") {
    throw new AppError(status6.FORBIDDEN, "You are not allowed to update this event");
  }
  const { date, ...rest } = payload;
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...rest,
      date: date ? new Date(date) : event.date
    }
  });
  return updatedEvent;
};
var deleteEvent = async (userId, eventId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  if (!event) {
    throw new AppError(status6.NOT_FOUND, "Event not found");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (event.creatorId !== userId && user?.role !== "ADMIN") {
    throw new AppError(status6.FORBIDDEN, "You are not allowed to delete this event");
  }
  await prisma.event.delete({
    where: { id: eventId }
  });
  return null;
};
var getAllEvents = async (query) => {
  const { searchTerm, isPublic, isFeatured, feeType, type, creatorId, page = 1, limit = 10 } = query;
  const where = {};
  if (creatorId) {
    where.creatorId = creatorId;
  }
  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { creator: { name: { contains: searchTerm, mode: "insensitive" } } }
    ];
  }
  if (isPublic !== void 0) {
    where.isPublic = isPublic === "true";
  }
  if (isFeatured !== void 0) {
    where.isFeatured = isFeatured === "true";
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
        select: { id: true, name: true, image: true }
      },
      participants: {
        select: { status: true }
      }
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: { createdAt: "desc" }
  });
  const total = await prisma.event.count({ where });
  const data = events.map((event) => {
    const joinedCount = event.participants.filter((p) => p.status === "APPROVED").length;
    const pendingCount = event.participants.filter((p) => p.status === "PENDING").length;
    const { participants, ...rest } = event;
    return { ...rest, joinedCount, pendingCount };
  });
  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total
    },
    data
  };
};
var getEventById = async (eventId, userId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: {
        select: { id: true, name: true, image: true }
      },
      reviews: {
        include: {
          user: { select: { id: true, name: true, image: true } }
        }
      },
      _count: {
        select: { participants: true }
      }
    }
  });
  if (!event) {
    throw new AppError(status6.NOT_FOUND, "Event not found");
  }
  let participationStatus = null;
  let isParticipant = false;
  if (userId) {
    const participant = await prisma.participant.findUnique({
      where: {
        userId_eventId: { userId, eventId }
      }
    });
    participationStatus = participant ? participant.status : null;
    isParticipant = participant?.status === "APPROVED";
  }
  const isOwner = userId === event.creatorId;
  const result = { ...event, participationStatus };
  if (!isOwner && !isParticipant) {
    result.meetingLink = null;
  }
  return result;
};
var getFeaturedEvent = async () => {
  let event = await prisma.event.findFirst({
    where: { isFeatured: true },
    include: {
      creator: { select: { id: true, name: true, image: true } }
    }
  });
  if (!event) {
    event = await prisma.event.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, image: true } }
      }
    });
  }
  return event;
};
var updateFeaturedEvent = async (eventId) => {
  await prisma.event.updateMany({
    data: { isFeatured: false }
  });
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { isFeatured: true }
  });
  return event;
};
var getUpcomingEvents = async () => {
  const events = await prisma.event.findMany({
    where: {
      isPublic: true,
      date: { gte: /* @__PURE__ */ new Date() }
    },
    take: 9,
    orderBy: { date: "asc" },
    include: {
      creator: { select: { id: true, name: true, image: true } }
    }
  });
  return events;
};
var eventService = {
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  getFeaturedEvent,
  updateFeaturedEvent,
  getUpcomingEvents
};

// src/app/modules/event/event.controller.ts
import status7 from "http-status";

// src/app/modules/event/event.validation.ts
import { z as z2 } from "zod";
import { EventType } from "@prisma/client";
var createEventSchema = z2.object({
  title: z2.string().min(1, "Title is required"),
  description: z2.string().min(1, "Description is required"),
  date: z2.string().min(1, "Date is required"),
  time: z2.string().min(1, "Time is required"),
  venue: z2.string().min(1, "Venue is required"),
  meetingLink: z2.string().optional(),
  type: z2.nativeEnum(EventType).default(EventType.OFFLINE),
  isPublic: z2.boolean().default(true),
  fee: z2.number().default(0),
  imageUrl: z2.string().optional()
});
var updateEventSchema = createEventSchema.partial();
var EventValidation = {
  createEventSchema,
  updateEventSchema
};

// src/app/modules/event/event.controller.ts
var createEvent2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const payload = req.body;
  if (req.file) {
    payload.imageUrl = req.file.path;
  }
  if (typeof payload.fee === "string") {
    const parsedFee = parseFloat(payload.fee);
    payload.fee = isNaN(parsedFee) ? 0 : parsedFee;
  }
  if (typeof payload.isPublic === "string") {
    payload.isPublic = payload.isPublic === "true";
  }
  const validatedData = EventValidation.createEventSchema.parse(payload);
  const eventData = {
    title: validatedData.title,
    description: validatedData.description,
    date: validatedData.date,
    time: validatedData.time,
    venue: validatedData.venue,
    meetingLink: validatedData.meetingLink || null,
    type: validatedData.type,
    isPublic: validatedData.isPublic,
    fee: validatedData.fee,
    imageUrl: validatedData.imageUrl || null
  };
  const result = await eventService.createEvent(userId, eventData);
  sendResponse(res, {
    httpStatusCode: status7.CREATED,
    success: true,
    message: "Event created successfully",
    data: result
  });
});
var updateEvent2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { eventId } = req.params;
  const payload = req.body;
  if (req.file) {
    payload.imageUrl = req.file.path;
  }
  if (typeof payload.fee === "string") {
    const parsedFee = parseFloat(payload.fee);
    payload.fee = isNaN(parsedFee) ? 0 : parsedFee;
  }
  if (typeof payload.isPublic === "string") {
    payload.isPublic = payload.isPublic === "true";
  }
  const validatedData = EventValidation.updateEventSchema.parse(payload);
  const eventData = {};
  const fields = ["title", "description", "date", "time", "venue", "meetingLink", "type", "isPublic", "fee", "imageUrl"];
  fields.forEach((field) => {
    if (validatedData[field] !== void 0) {
      eventData[field] = validatedData[field];
    }
  });
  const result = await eventService.updateEvent(userId, eventId, eventData);
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Event updated successfully",
    data: result
  });
});
var deleteEvent2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { eventId } = req.params;
  await eventService.deleteEvent(userId, eventId);
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Event deleted successfully",
    data: null
  });
});
var getAllEvents2 = catchAsync(async (req, res) => {
  const query = req.query;
  const result = await eventService.getAllEvents(query);
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Events retrieved successfully",
    data: result
  });
});
var getEventById2 = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user?.userId;
  const result = await eventService.getEventById(eventId, userId);
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Event retrieved successfully",
    data: result
  });
});
var getFeaturedEvent2 = catchAsync(async (req, res) => {
  const result = await eventService.getFeaturedEvent();
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Featured event retrieved successfully",
    data: result
  });
});
var getUpcomingEvents2 = catchAsync(async (req, res) => {
  const result = await eventService.getUpcomingEvents();
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Upcoming events retrieved successfully",
    data: result
  });
});
var updateFeaturedEvent2 = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const result = await eventService.updateFeaturedEvent(eventId);
  sendResponse(res, {
    httpStatusCode: status7.OK,
    success: true,
    message: "Event featured updated successfully",
    data: result
  });
});
var eventController = {
  createEvent: createEvent2,
  updateEvent: updateEvent2,
  deleteEvent: deleteEvent2,
  getAllEvents: getAllEvents2,
  getEventById: getEventById2,
  getFeaturedEvent: getFeaturedEvent2,
  updateFeaturedEvent: updateFeaturedEvent2,
  getUpcomingEvents: getUpcomingEvents2
};

// src/app/modules/event/event.routes.ts
import jwt4 from "jsonwebtoken";
var router3 = express2.Router();
var optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    try {
      const decoded = jwt4.verify(token, envVars.AUTH_SECRET);
      req.user = { userId: decoded.userId, role: decoded.role };
    } catch (error) {
    }
  }
  next();
};
router3.get("/", getAllEventsMiddleware);
router3.get("/featured", eventController.getFeaturedEvent);
router3.get("/upcoming", eventController.getUpcomingEvents);
router3.get("/:eventId", optionalAuth, eventController.getEventById);
router3.post("/", requireAuth, upload.single("image"), eventController.createEvent);
router3.patch("/:eventId", requireAuth, upload.single("image"), eventController.updateEvent);
router3.delete("/:eventId", requireAuth, eventController.deleteEvent);
router3.patch("/:eventId/feature", requireAuth, allowRoles("ADMIN"), eventController.updateFeaturedEvent);
function getAllEventsMiddleware(req, res, next) {
  eventController.getAllEvents(req, res, next);
}
var EventRoutes = router3;

// src/app/modules/participation/participation.routes.ts
import express3 from "express";

// src/app/modules/participation/participation.service.ts
import status8 from "http-status";
import { ParticipationStatus, PaymentStatus } from "@prisma/client";
var joinEvent = async (userId, eventId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  if (!event) {
    throw new AppError(status8.NOT_FOUND, "Event not found");
  }
  const existingParticipation = await prisma.participant.findUnique({
    where: { userId_eventId: { userId, eventId } }
  });
  if (existingParticipation) {
    throw new AppError(status8.BAD_REQUEST, "You are already a participant or have a pending request");
  }
  let initialStatus = ParticipationStatus.PENDING;
  if (event.isPublic && event.fee === 0) {
    initialStatus = ParticipationStatus.APPROVED;
  }
  const participant = await prisma.participant.create({
    data: {
      userId,
      eventId,
      status: initialStatus,
      paymentStatus: event.fee > 0 ? PaymentStatus.UNPAID : PaymentStatus.PAID
    }
  });
  return participant;
};
var updateParticipationStatus = async (ownerId, participantId, statusPayload) => {
  const participation = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { event: true }
  });
  if (!participation) {
    throw new AppError(status8.NOT_FOUND, "Participation record not found");
  }
  if (participation.event.creatorId !== ownerId) {
    throw new AppError(status8.FORBIDDEN, "Only the event creator can manage participants");
  }
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.participant.update({
      where: { id: participantId },
      data: { status: statusPayload }
    });
    if (statusPayload === ParticipationStatus.APPROVED) {
      if (participation.paymentStatus === PaymentStatus.PAID && participation.event.fee > 0) {
        const amount = participation.event.fee;
        const platformFee = amount * 0.1;
        const creatorEarn = amount - platformFee;
        await tx.earnings.create({
          data: {
            eventId: participation.eventId,
            creatorId: participation.event.creatorId,
            amount,
            platformFee,
            creatorEarn
          }
        });
      }
    }
    return updated;
  });
  return result;
};
var getEventParticipants = async (ownerId, eventId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  if (!event) {
    throw new AppError(status8.NOT_FOUND, "Event not found");
  }
  if (event.creatorId !== ownerId) {
    const user = await prisma.user.findUnique({ where: { id: ownerId } });
    if (user?.role !== "ADMIN") {
      throw new AppError(status8.FORBIDDEN, "Only the event creator or admin can view all participants");
    }
  }
  const participants = await prisma.participant.findMany({
    where: { eventId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } }
    }
  });
  return participants;
};
var getMyParticipations = async (userId) => {
  const participations = await prisma.participant.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          creator: { select: { id: true, name: true } }
        }
      }
    }
  });
  return participations;
};
var participationService = {
  joinEvent,
  updateParticipationStatus,
  getEventParticipants,
  getMyParticipations
};

// src/app/modules/participation/participation.controller.ts
import status9 from "http-status";
var joinEvent2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { eventId } = req.body;
  const result = await participationService.joinEvent(userId, eventId);
  sendResponse(res, {
    httpStatusCode: status9.CREATED,
    success: true,
    message: "Participation request submitted successfully",
    data: result
  });
});
var updateParticipationStatus2 = catchAsync(async (req, res) => {
  const ownerId = req.user?.userId;
  const { participantId } = req.params;
  const { status: statusPayload } = req.body;
  const result = await participationService.updateParticipationStatus(ownerId, participantId, statusPayload);
  sendResponse(res, {
    httpStatusCode: status9.OK,
    success: true,
    message: "Participant status updated successfully",
    data: result
  });
});
var getEventParticipants2 = catchAsync(async (req, res) => {
  const ownerId = req.user?.userId;
  const { eventId } = req.params;
  const result = await participationService.getEventParticipants(ownerId, eventId);
  sendResponse(res, {
    httpStatusCode: status9.OK,
    success: true,
    message: "Event participants retrieved successfully",
    data: result
  });
});
var getMyParticipations2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await participationService.getMyParticipations(userId);
  sendResponse(res, {
    httpStatusCode: status9.OK,
    success: true,
    message: "My participations retrieved successfully",
    data: result
  });
});
var participationController = {
  joinEvent: joinEvent2,
  updateParticipationStatus: updateParticipationStatus2,
  getEventParticipants: getEventParticipants2,
  getMyParticipations: getMyParticipations2
};

// src/app/modules/participation/participation.routes.ts
var router4 = express3.Router();
router4.post("/join", requireAuth, participationController.joinEvent);
router4.patch("/:participantId/status", requireAuth, participationController.updateParticipationStatus);
router4.get("/event/:eventId", requireAuth, participationController.getEventParticipants);
router4.get("/my-participations", requireAuth, participationController.getMyParticipations);
var ParticipationRoutes = router4;

// src/app/modules/payment/payment.routes.ts
import express4 from "express";

// src/app/modules/payment/payment.service.ts
import Stripe from "stripe";
import status10 from "http-status";
import { ParticipationStatus as ParticipationStatus2, PaymentStatus as PaymentStatus2 } from "@prisma/client";
var stripe = new Stripe(envVars.STRIPE_SECRET_KEY);
var createCheckoutSession = async (userId, eventId, invitationId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  if (!event) {
    throw new AppError(status10.NOT_FOUND, "Event not found");
  }
  if (event.fee <= 0) {
    throw new AppError(status10.BAD_REQUEST, "This event is free");
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: event.title,
            description: event.description
          },
          unit_amount: Math.round(event.fee * 100)
        },
        quantity: 1
      }
    ],
    success_url: `${envVars.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/payment/cancel`,
    metadata: {
      userId,
      eventId,
      invitationId: invitationId || "none"
    }
  });
  return session;
};
var handleWebhook = async (sig, payload) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new AppError(status10.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, eventId, invitationId } = session.metadata;
    if (!userId || !eventId) {
      throw new AppError(status10.BAD_REQUEST, "Invalid session metadata");
    }
    try {
      const participation = await prisma.participant.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {
          paymentStatus: PaymentStatus2.PAID,
          transactionId: session.id
        },
        create: {
          userId,
          eventId,
          paymentStatus: PaymentStatus2.PAID,
          status: ParticipationStatus2.PENDING,
          transactionId: session.id
        },
        include: { event: true }
      });
      if (invitationId && invitationId !== "none") {
        await prisma.invitation.updateMany({
          where: { id: invitationId, status: { not: "ACCEPTED" } },
          data: { status: "ACCEPTED" }
        });
      }
    } catch (e) {
      console.error("Webhook processing error:", e);
    }
  }
  return { received: true };
};
var getMyEarnings = async (userId) => {
  const earnings = await prisma.earnings.findMany({
    where: { creatorId: userId },
    include: {
      event: { select: { title: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  const totalEarnings = await prisma.earnings.aggregate({
    where: { creatorId: userId },
    _sum: { creatorEarn: true }
  });
  return {
    earnings,
    total: totalEarnings._sum.creatorEarn || 0
  };
};
var verifyPayment = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid") {
    const { userId, eventId, invitationId } = session.metadata;
    if (!userId || !eventId) {
      throw new AppError(status10.BAD_REQUEST, "Invalid session metadata");
    }
    try {
      const participation = await prisma.participant.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {
          paymentStatus: PaymentStatus2.PAID,
          transactionId: session.id
        },
        create: {
          userId,
          eventId,
          paymentStatus: PaymentStatus2.PAID,
          status: ParticipationStatus2.PENDING,
          transactionId: session.id
        },
        include: { event: true }
      });
      if (invitationId && invitationId !== "none") {
        await prisma.invitation.updateMany({
          where: { id: invitationId, status: { not: "ACCEPTED" } },
          data: { status: "ACCEPTED" }
        });
      }
      return participation;
    } catch (error) {
      console.error("Verification error:", error);
      throw new AppError(status10.INTERNAL_SERVER_ERROR, "Failed to verify transaction in database");
    }
  }
  throw new AppError(status10.BAD_REQUEST, "Payment not completed");
};
var paymentService = {
  createCheckoutSession,
  handleWebhook,
  getMyEarnings,
  verifyPayment
};

// src/app/modules/payment/payment.controller.ts
import status11 from "http-status";
var createCheckoutSession2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { eventId } = req.body;
  const session = await paymentService.createCheckoutSession(userId, eventId);
  sendResponse(res, {
    httpStatusCode: status11.OK,
    success: true,
    message: "Checkout session created",
    data: { url: session.url }
  });
});
var handleWebhook2 = catchAsync(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const payload = req.rawBody || req.body;
  const result = await paymentService.handleWebhook(sig, payload);
  res.status(status11.OK).json(result);
});
var getMyEarnings2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await paymentService.getMyEarnings(userId);
  sendResponse(res, {
    httpStatusCode: status11.OK,
    success: true,
    message: "My earnings retrieved successfully",
    data: result
  });
});
var verifyPayment2 = catchAsync(async (req, res) => {
  const { session_id } = req.query;
  const result = await paymentService.verifyPayment(session_id);
  sendResponse(res, {
    httpStatusCode: status11.OK,
    success: true,
    message: "Payment verified and participation created",
    data: result
  });
});
var paymentController = {
  createCheckoutSession: createCheckoutSession2,
  handleWebhook: handleWebhook2,
  getMyEarnings: getMyEarnings2,
  verifyPayment: verifyPayment2
};

// src/app/modules/payment/payment.routes.ts
var router5 = express4.Router();
router5.post("/checkout", requireAuth, paymentController.createCheckoutSession);
router5.get("/verify-payment", requireAuth, paymentController.verifyPayment);
router5.get("/earnings", requireAuth, paymentController.getMyEarnings);
router5.post(
  "/webhook",
  express4.raw({ type: "application/json" }),
  paymentController.handleWebhook
);
var PaymentRoutes = router5;

// src/app/modules/invitation/invitation.routes.ts
import express5 from "express";

// src/app/modules/invitation/invitation.controller.ts
import httpStatus2 from "http-status";

// src/app/modules/invitation/invitation.service.ts
import httpStatus from "http-status";
import { InvitationStatus } from "@prisma/client";
var sendInvitation = async (senderId, eventId, receiverId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  if (!event || event.creatorId !== senderId) {
    throw new AppError(httpStatus.FORBIDDEN, "Only the event creator can send invitations.");
  }
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId }
  });
  if (!receiver) {
    throw new AppError(httpStatus.NOT_FOUND, "Receiver user not found.");
  }
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      eventId,
      senderId,
      receiverId
    }
  });
  if (existingInvitation) {
    throw new AppError(httpStatus.CONFLICT, "Invitation already sent to this user for this event.");
  }
  const invitation = await prisma.invitation.create({
    data: {
      eventId,
      senderId,
      receiverId,
      status: InvitationStatus.PENDING
    }
  });
  return invitation;
};
var getInvitations = async (userId) => {
  const invitations = await prisma.invitation.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }]
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          venue: true,
          imageUrl: true,
          fee: true,
          type: true
        }
      },
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
  return invitations;
};
var updateInvitationStatus = async (invitationId, userId, status16) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId }
  });
  if (!invitation || invitation.receiverId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invitation not found or you are not the receiver."
    );
  }
  if (status16 === InvitationStatus.ACCEPTED) {
    const event = await prisma.event.findUnique({ where: { id: invitation.eventId } });
    if (event?.fee === 0) {
      await prisma.participant.create({
        data: {
          eventId: invitation.eventId,
          userId: invitation.receiverId,
          status: "APPROVED"
          // Assuming direct approval for free invited participants
        }
      });
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot accept a paid event invitation without payment."
      );
    }
  }
  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: status16 }
  });
  return updatedInvitation;
};
var payAndAcceptInvitation = async (invitationId, userId) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { event: true }
  });
  if (!invitation || invitation.receiverId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invitation not found or you are not the receiver."
    );
  }
  if (invitation.event.fee === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This is a free event, no payment needed. Use accept invitation instead."
    );
  }
  const session = await paymentService.createCheckoutSession(userId, invitation.eventId, invitationId);
  return { url: session.url };
};
var searchUsers = async (searchTerm, excludeUserId, eventId) => {
  const where = {
    AND: [
      { id: { not: excludeUserId } },
      { role: { not: "ADMIN" } }
    ]
  };
  if (searchTerm) {
    where.AND.push({
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive"
          }
        },
        {
          email: {
            contains: searchTerm,
            mode: "insensitive"
          }
        }
      ]
    });
  }
  if (eventId) {
    where.AND.push({
      participants: {
        none: { eventId }
      }
    });
    where.AND.push({
      receivedInvitations: {
        none: {
          eventId,
          status: { in: ["PENDING", "ACCEPTED"] }
        }
      }
    });
  }
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });
  try {
    const fs = await import("fs");
    fs.appendFileSync("tmp/search_log.txt", `[${(/* @__PURE__ */ new Date()).toISOString()}] eventId: ${eventId} | searchTerm: "${searchTerm}" | count: ${users.length} | userIds: ${users.map((u) => u.id).join(", ")}
`);
  } catch (err) {
  }
  return users;
};
var InvitationService = {
  sendInvitation,
  getInvitations,
  updateInvitationStatus,
  payAndAcceptInvitation,
  searchUsers
};

// src/app/modules/invitation/invitation.controller.ts
var sendInvitation2 = catchAsync(async (req, res) => {
  const { eventId, receiverId } = req.body;
  const senderId = req.user?.userId;
  const result = await InvitationService.sendInvitation(senderId, eventId, receiverId);
  sendResponse(res, {
    httpStatusCode: httpStatus2.CREATED,
    success: true,
    message: "Invitation sent successfully",
    data: result
  });
});
var getInvitations2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await InvitationService.getInvitations(userId);
  sendResponse(res, {
    httpStatusCode: httpStatus2.OK,
    success: true,
    message: "Invitations fetched successfully",
    data: result
  });
});
var updateInvitationStatus2 = catchAsync(async (req, res) => {
  const { invitationId } = req.params;
  const { status: status16 } = req.body;
  const userId = req.user?.userId;
  const result = await InvitationService.updateInvitationStatus(invitationId, userId, status16);
  sendResponse(res, {
    httpStatusCode: httpStatus2.OK,
    success: true,
    message: "Invitation status updated successfully",
    data: result
  });
});
var payAndAcceptInvitation2 = catchAsync(async (req, res) => {
  const { invitationId } = req.params;
  const userId = req.user?.userId;
  const result = await InvitationService.payAndAcceptInvitation(invitationId, userId);
  sendResponse(res, {
    httpStatusCode: httpStatus2.OK,
    success: true,
    message: "Payment successful and invitation accepted",
    data: result
  });
});
var searchUsers2 = catchAsync(async (req, res) => {
  const { searchTerm, eventId } = req.query;
  const userId = req.user?.userId;
  const result = await InvitationService.searchUsers(searchTerm, userId, eventId);
  sendResponse(res, {
    httpStatusCode: httpStatus2.OK,
    success: true,
    message: "Users fetched successfully",
    data: result
  });
});
var InvitationController = {
  sendInvitation: sendInvitation2,
  getInvitations: getInvitations2,
  updateInvitationStatus: updateInvitationStatus2,
  payAndAcceptInvitation: payAndAcceptInvitation2,
  searchUsers: searchUsers2
};

// src/app/modules/invitation/invitation.routes.ts
import { Role } from "@prisma/client";
var router6 = express5.Router();
router6.post(
  "/",
  requireAuth,
  allowRoles(Role.ADMIN, Role.USER),
  // Only event creator can send, but they can be ADMIN or USER
  InvitationController.sendInvitation
);
router6.get(
  "/",
  requireAuth,
  InvitationController.getInvitations
);
router6.patch(
  "/:invitationId/status",
  requireAuth,
  InvitationController.updateInvitationStatus
);
router6.patch(
  "/:invitationId/pay-accept",
  requireAuth,
  InvitationController.payAndAcceptInvitation
);
router6.get(
  "/search-users",
  requireAuth,
  InvitationController.searchUsers
);
var InvitationRoutes = router6;

// src/app/modules/review/review.routes.ts
import express6 from "express";

// src/app/modules/review/review.service.ts
import status12 from "http-status";
var createReview = async (userId, payload) => {
  const participation = await prisma.participant.findUnique({
    where: { userId_eventId: { userId, eventId: payload.eventId } }
  });
  if (!participation || participation.status !== "APPROVED") {
    throw new AppError(status12.FORBIDDEN, "Only approved participants can review events");
  }
  const review = await prisma.review.create({
    data: {
      userId,
      eventId: payload.eventId,
      rating: payload.rating,
      comment: payload.comment
    }
  });
  return review;
};
var updateReview = async (userId, reviewId, payload) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  });
  if (!review) {
    throw new AppError(status12.NOT_FOUND, "Review not found");
  }
  if (review.userId !== userId) {
    throw new AppError(status12.FORBIDDEN, "You can only update your own reviews");
  }
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: payload
  });
  return updated;
};
var deleteReview = async (userId, reviewId) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  });
  if (!review) {
    throw new AppError(status12.NOT_FOUND, "Review not found");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (review.userId !== userId && user?.role !== "ADMIN") {
    throw new AppError(status12.FORBIDDEN, "You can only delete your own reviews");
  }
  await prisma.review.delete({
    where: { id: reviewId }
  });
  return null;
};
var getMyReviews = async (userId) => {
  const reviews = await prisma.review.findMany({
    where: { userId },
    include: {
      event: { select: { title: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return reviews;
};
var reviewService = {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews
};

// src/app/modules/review/review.controller.ts
import status13 from "http-status";
var createReview2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await reviewService.createReview(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status13.CREATED,
    success: true,
    message: "Review created successfully",
    data: result
  });
});
var updateReview2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { reviewId } = req.params;
  const result = await reviewService.updateReview(userId, reviewId, req.body);
  sendResponse(res, {
    httpStatusCode: status13.OK,
    success: true,
    message: "Review updated successfully",
    data: result
  });
});
var deleteReview2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { reviewId } = req.params;
  await reviewService.deleteReview(userId, reviewId);
  sendResponse(res, {
    httpStatusCode: status13.OK,
    success: true,
    message: "Review deleted successfully",
    data: null
  });
});
var getMyReviews2 = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await reviewService.getMyReviews(userId);
  sendResponse(res, {
    httpStatusCode: status13.OK,
    success: true,
    message: "My reviews retrieved successfully",
    data: result
  });
});
var reviewController = {
  createReview: createReview2,
  updateReview: updateReview2,
  deleteReview: deleteReview2,
  getMyReviews: getMyReviews2
};

// src/app/modules/review/review.routes.ts
var router7 = express6.Router();
router7.post("/", requireAuth, reviewController.createReview);
router7.patch("/:reviewId", requireAuth, reviewController.updateReview);
router7.delete("/:reviewId", requireAuth, reviewController.deleteReview);
router7.get("/my-reviews", requireAuth, reviewController.getMyReviews);
var ReviewRoutes = router7;

// src/app/modules/admin/admin.routes.ts
import express7 from "express";

// src/app/modules/admin/admin.service.ts
import status14 from "http-status";
var getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true
    }
  });
  return users;
};
var deleteUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(status14.NOT_FOUND, "User not found");
  }
  await prisma.user.delete({ where: { id: userId } });
  return null;
};
var getAllEvents3 = async () => {
  const events = await prisma.event.findMany({
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          participants: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  return events;
};
var deleteEvent3 = async (eventId) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError(status14.NOT_FOUND, "Event not found");
  }
  await prisma.event.delete({ where: { id: eventId } });
  return null;
};
var getDashboardStats3 = async () => {
  const totalUsers = await prisma.user.count();
  const totalEvents = await prisma.event.count();
  const totalParticipants = await prisma.participant.count({
    where: { status: "APPROVED" }
  });
  const totalEarnings = await prisma.earnings.aggregate({
    _sum: {
      amount: true,
      platformFee: true
    }
  });
  return {
    totalUsers,
    totalEvents,
    totalParticipants,
    platformRevenue: totalEarnings._sum.platformFee || 0,
    totalEarnings: totalEarnings._sum.amount || 0
  };
};
var toggleFeaturedEvent = async (eventId, isFeatured) => {
  if (isFeatured) {
    const existingFeatured = await prisma.event.findFirst({
      where: { isFeatured: true }
    });
    if (existingFeatured && existingFeatured.id !== eventId) {
      throw new AppError(status14.BAD_REQUEST, "A featured event already exists. Remove it before adding a new one.");
    }
  }
  const result = await prisma.event.update({
    where: { id: eventId },
    data: { isFeatured }
  });
  return result;
};
var adminService = {
  getAllUsers,
  deleteUser,
  getAllEvents: getAllEvents3,
  deleteEvent: deleteEvent3,
  getDashboardStats: getDashboardStats3,
  toggleFeaturedEvent
};

// src/app/modules/admin/admin.controller.ts
import status15 from "http-status";
var getAllUsers2 = catchAsync(async (req, res) => {
  const result = await adminService.getAllUsers();
  sendResponse(res, {
    httpStatusCode: status15.OK,
    success: true,
    message: "All users retrieved successfully",
    data: result
  });
});
var deleteUser2 = catchAsync(async (req, res) => {
  const { userId } = req.params;
  await adminService.deleteUser(userId);
  sendResponse(res, {
    httpStatusCode: status15.OK,
    success: true,
    message: "User deleted successfully",
    data: null
  });
});
var getAllEvents4 = catchAsync(async (req, res) => {
  const result = await adminService.getAllEvents();
  sendResponse(res, {
    httpStatusCode: status15.OK,
    success: true,
    message: "All events retrieved successfully",
    data: result
  });
});
var deleteEvent4 = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  await adminService.deleteEvent(eventId);
  sendResponse(res, {
    httpStatusCode: status15.OK,
    success: true,
    message: "Event deleted successfully",
    data: null
  });
});
var getDashboardStats4 = catchAsync(async (req, res) => {
  const result = await adminService.getDashboardStats();
  sendResponse(res, {
    httpStatusCode: status15.OK,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result
  });
});
var toggleFeaturedEvent2 = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { isFeatured } = req.body;
  const result = await adminService.toggleFeaturedEvent(eventId, isFeatured);
  sendResponse(res, {
    httpStatusCode: status15.OK,
    success: true,
    message: "Event featured status updated successfully",
    data: result
  });
});
var adminController = {
  getAllUsers: getAllUsers2,
  deleteUser: deleteUser2,
  getAllEvents: getAllEvents4,
  deleteEvent: deleteEvent4,
  getDashboardStats: getDashboardStats4,
  toggleFeaturedEvent: toggleFeaturedEvent2
};

// src/app/modules/admin/admin.routes.ts
var router8 = express7.Router();
router8.get("/users", requireAuth, allowRoles("ADMIN"), adminController.getAllUsers);
router8.delete("/users/:userId", requireAuth, allowRoles("ADMIN"), adminController.deleteUser);
router8.get("/events", requireAuth, allowRoles("ADMIN"), adminController.getAllEvents);
router8.delete("/events/:eventId", requireAuth, allowRoles("ADMIN"), adminController.deleteEvent);
router8.patch("/events/:eventId/feature", requireAuth, allowRoles("ADMIN"), adminController.toggleFeaturedEvent);
router8.get("/stats", requireAuth, allowRoles("ADMIN"), adminController.getDashboardStats);
var AdminRoutes = router8;

// src/app/routes/index.ts
var router9 = Router2();
var moduleRoutes = [
  { path: "/auth", route: authRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/events", route: EventRoutes },
  { path: "/participations", route: ParticipationRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/invitations", route: InvitationRoutes },
  { path: "/reviews", route: ReviewRoutes },
  { path: "/admin", route: AdminRoutes }
];
moduleRoutes.forEach((route) => router9.use(route.path, route.route));
var indexRoutes = router9;

// src/app.ts
var app = express8();
app.use(cors({ origin: envVars.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  express8.json({
    verify: (req, res, buf) => {
      if (req.originalUrl.includes("/webhook")) {
        req.rawBody = buf;
      }
    }
  })
);
app.use(express8.urlencoded({ extended: true }));
app.use("/api/v1", indexRoutes);
app.get("/", async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Planora API is running"
  });
});
app.use(globalErrorHandler);
app.use(notFound);
var app_default = app;

// src/index.ts
var index_default = app_default;
export {
  index_default as default
};
