import { z } from "zod";

export const createQuestionSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caracteres")
    .max(150, "Le titre ne peut pas depasser 150 caracteres"),
  body: z
    .string()
    .min(5, "La question doit contenir au moins 5 caracteres")
    .max(3000, "La question ne peut pas depasser 3000 caracteres"),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const replyQuestionSchema = z.object({
  body: z
    .string()
    .min(1, "La reponse ne peut pas etre vide")
    .max(3000, "La reponse ne peut pas depasser 3000 caracteres"),
});

export type ReplyQuestionInput = z.infer<typeof replyQuestionSchema>;
