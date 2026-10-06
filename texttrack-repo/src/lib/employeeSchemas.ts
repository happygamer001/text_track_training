import { z } from "zod";

export const STATUSES = ["PRE_ENROLLED", "ACTIVE", "STALLED", "SEPARATED"] as const;

export const updateEmployeeSchema = z
  .object({
    trackId: z.string().min(1).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((v) => v.trackId !== undefined || v.status !== undefined, {
    message: "Nothing to update.",
  });

export const addEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  phone: z.string().trim().min(7, "Enter a mobile number").max(30),
  trackId: z.string().min(1, "Choose a track"),
});
