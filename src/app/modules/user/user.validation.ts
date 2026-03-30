import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
});

export const UserValidation = {
  updateProfileSchema,
};
