import { z } from "zod";


const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name is too long"),

  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Please provide a valid email address")),

  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long"),
});


const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Please provide a valid email address")),

  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long"),
});


export const AuthValidation = {
  registerSchema,
  loginSchema,
};