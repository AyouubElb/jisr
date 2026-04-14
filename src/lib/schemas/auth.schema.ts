import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Veuillez entrer une adresse e-mail valide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  email: z.string().email("Veuillez entrer une adresse e-mail valide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caracteres"),
  role: z.enum(["student", "instructor"], { message: "Veuillez selectionner un role" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
