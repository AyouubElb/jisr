/**
 * Client-side wrapper around the AI Route handlers. Components never call
 * fetch directly; they go through here so error handling and shapes stay
 * consistent across every AI feature.
 */

export interface GenerateQuizInput {
  sectionId: string;
  lessonIds: string[];
  numQuestions: number;
  mix: {
    mcq: number;
    fill_blank: number;
    free_text: number;
    audio_passage: number;
  };
  questionsPerAudioPassage: number;
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
