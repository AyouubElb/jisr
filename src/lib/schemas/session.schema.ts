import { z } from "zod";

export const createSessionSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  meeting_link: z.string().url("Veuillez entrer une URL valide"),
  scheduled_at: z.string().min(1, "Veuillez selectionner une date et une heure"),
  duration_minutes: z.coerce.number().min(15, "Minimum 15 minutes").max(180, "Maximum 3 heures"),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
