import { z } from "zod";

export const createTrackSchema = z.object({
  adminId: z.string().min(1, "adminId is required"),
  name: z.string().trim().min(2, "Track name is too short").max(80, "Track name is too long"),
});

export const createTopicSchema = z.object({
  adminId: z.string().min(1, "adminId is required"),
  trackId: z.string().min(1, "Choose a track"),
  weekNumber: z.coerce.number().int().min(1, "Week must be 1 or higher").max(104),
  category: z.string().trim().min(2, "Category is required").max(80),
  title: z.string().trim().min(3, "Title is required").max(160),
  smsBody: z.string().trim().min(1, "Text message is required").max(1000),
  deliveryFormat: z.string().trim().min(2, "Delivery format is required").max(40),
  videoFormat: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
