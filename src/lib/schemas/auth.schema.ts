import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Veuillez entrer une adresse e-mail valide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const instructorSignupSchema = z.object({
  token: z.string().min(1),
  full_name: z.string().min(2, "Veuillez entrer votre nom complet"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
});

export type InstructorSignupInput = z.infer<typeof instructorSignupSchema>;

export const createStudentSchema = z.object({
  full_name: z.string().min(2, "Nom requis (min 2 caracteres)"),
  email: z.string().email("Adresse e-mail invalide"),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  course_id: z.string().uuid().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Nom requis (min 2 caracteres)"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Minimum 8 caracteres")
      .regex(/[A-Z]/, "Au moins 1 majuscule")
      .regex(/[a-z]/, "Au moins 1 minuscule")
      .regex(/[0-9]/, "Au moins 1 chiffre")
      .regex(/[^A-Za-z0-9]/, "Au moins 1 symbole"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const createInviteSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  full_name: z.string().min(2, "Nom requis"),
  kind: z.enum(["instructor", "student"]),
  expires_in_days: z.coerce.number().int().min(1).max(30).default(7),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
