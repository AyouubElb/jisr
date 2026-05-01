/**
 * Client-side wrapper around the AI Route handlers. Components never call
 * fetch directly; they go through here so error handling and shapes stay
 * consistent across every AI feature.
 */
import type { AIQuizChange } from "@/lib/ai/schemas/quiz-edit.schema";

export interface GenerateQuizInput {
  sectionId: string;
  lessonIds: string[];
  numQuestions: number;
  mix: {
    mcq: number;
    fill_blank: number;
    free_text: number;
    voice_response: number;
    audio_passage: number;
    text_passage: number;
  };
  questionsPerPassage: number;
  focusTopic?: string;
}

export interface GenerateQuizResponse {
  quizId: string;
  courseId: string;
  title: string;
  cefrTargeted: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  skillsCovered: string[];
}

export interface ResolveGenerationInput {
  quizId: string;
  action: "save" | "delete";
}

export interface ProposeQuizEditInput {
  quizId: string;
  instruction: string;
  /** Pre-formatted in-session history. Empty string = first turn. */
  chatHistory?: string;
}

export interface ProposeQuizEditResponse {
  generationId: string;
  summary: string;
  // Server narrows the LLM's flat output to the wire shape before returning.
  changes: AIQuizChange[];
}

export interface ApplyQuizEditInput {
  quizId: string;
  generationId: string;
  changes: AIQuizChange[];
}

export interface ApplyQuizEditResponse {
  applied: number;
}

export interface ResolveGenerationResponse {
  resolved: boolean;
  state?: "accepted" | "edited" | "rejected";
  reason?: string;
}

export const aiApi = {
  resolveGeneration: async (
    input: ResolveGenerationInput,
  ): Promise<ResolveGenerationResponse> => {
    const res = await fetch("/api/ai/generations/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error ?? "Résolution de la génération échouée");
    }
    return (await res.json()) as ResolveGenerationResponse;
  },

  proposeQuizEdit: async (
    input: ProposeQuizEditInput,
  ): Promise<ProposeQuizEditResponse> => {
    const res = await fetch("/api/ai/edit-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "propose", ...input }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; rawText?: string | null }
        | null;
      if (payload?.rawText) {
        console.groupCollapsed(
          "[AI quiz edit] raw model output (schema mismatch)",
        );
        console.log(payload.rawText);
        console.groupEnd();
      }
      throw new Error(payload?.error ?? "L'édition IA a échoué");
    }
    return (await res.json()) as ProposeQuizEditResponse;
  },

  applyQuizEdit: async (
    input: ApplyQuizEditInput,
  ): Promise<ApplyQuizEditResponse> => {
    const res = await fetch("/api/ai/edit-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", ...input }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error ?? "Application des changements échouée");
    }
    return (await res.json()) as ApplyQuizEditResponse;
  },

  generateQuiz: async (input: GenerateQuizInput): Promise<GenerateQuizResponse> => {
    const res = await fetch("/api/ai/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; rawText?: string | null }
        | null;

      if (payload?.rawText) {
        console.groupCollapsed(
          "[AI quiz gen] raw model output (schema mismatch)",
        );
        console.log(payload.rawText);
        console.groupEnd();
      }

      throw new Error(payload?.error ?? "La génération IA a échoué");
    }

    return (await res.json()) as GenerateQuizResponse;
  },
};
