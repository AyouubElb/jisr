import type { CEFRLevel } from "@/lib/types";

export const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const LEVEL_LABELS_FR: Record<CEFRLevel, string> = {
  A1: "Debutant",
  A2: "Elementaire",
  B1: "Intermediaire",
  B2: "Intermediaire superieur",
  C1: "Avance",
  C2: "Maitrise",
};

export const LEVEL_LABELS_EN: Record<CEFRLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

export const LEVEL_LABELS = LEVEL_LABELS_FR;

export const LEVEL_BADGE_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-emerald-100 text-emerald-700",
  A2: "bg-teal-100 text-teal-700",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-indigo-100 text-indigo-700",
  C1: "bg-purple-100 text-purple-700",
  C2: "bg-rose-100 text-rose-700",
};
