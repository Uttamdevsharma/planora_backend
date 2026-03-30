import { z } from "zod";
import { EventType } from "../../../generated/prisma/enums";

const createEventSchema = z.object({
  title: z.string({ required_error: "Title is required" }),
  description: z.string({ required_error: "Description is required" }),
  date: z.string({ required_error: "Date is required" }),
  time: z.string({ required_error: "Time is required" }),
  venue: z.string({ required_error: "Venue is required" }),
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
