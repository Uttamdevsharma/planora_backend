import { z } from "zod";
import { EventType } from "@prisma/client";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  venue: z.string().min(1, "Venue is required"),
  meetingLink: z.string().optional(),
  type: z.nativeEnum(EventType).default(EventType.OFFLINE),
  isPublic: z.boolean().default(true),
  fee: z.number().default(0),
  imageUrl: z.string().optional(),
});

const updateEventSchema = createEventSchema.partial();

export const EventValidation = {
  createEventSchema,
  updateEventSchema,
};
