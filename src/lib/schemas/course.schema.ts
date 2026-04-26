import { z } from "zod";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const createCourseSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  description: z.string().min(10, "La description doit contenir au moins 10 caracteres"),
  level: z.enum(CEFR_LEVELS, { message: "Veuillez selectionner un niveau valide" }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const createSectionSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const createLessonSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  content: z.string(),
  type: z.enum(["grammar", "vocabulary", "resource"], { message: "Veuillez selectionner un type" }),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
