import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aiApi,
  type GenerateQuizInput,
  type GenerateQuizResponse,
  type ResolveGenerationInput,
  type ResolveGenerationResponse,
} from "@/lib/api/ai.api";
import { courseKeys, quizKeys } from "@/lib/constants/queryKeys";

export const useGenerateAIQuiz = (courseId: string, sectionId: string) => {
  const queryClient = useQueryClient();

  return useMutation<GenerateQuizResponse, Error, GenerateQuizInput>({
    mutationFn: aiApi.generateQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.bySection(sectionId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Brouillon de quiz généré — révisez avant de publier");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

// Fires once per AI-generated quiz — sticky on first save/delete.
// Silent: never toast (users don't need to know metrics were logged).
export const useResolveAIGeneration = () => {
  return useMutation<ResolveGenerationResponse, Error, ResolveGenerationInput>({
    mutationFn: aiApi.resolveGeneration,
    onError: (error) => {
      console.error("[ai.resolve] failed:", error.message);
    },
  });
};
