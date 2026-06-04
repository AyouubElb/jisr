import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aiApi,
  type ApplyQuizEditInput,
  type ApplyQuizEditResponse,
  type GenerateQuizInput,
  type GenerateQuizResponse,
  type ProposeQuizEditInput,
  type ProposeQuizEditResponse,
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
      toast.success("Quiz draft generated. Review before publishing.");
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

// Stage 1 quiz editor — propose changes (no DB write yet).
export const useProposeAIQuizEdit = () => {
  return useMutation<ProposeQuizEditResponse, Error, ProposeQuizEditInput>({
    mutationFn: aiApi.proposeQuizEdit,
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

// Apply the changes the instructor accepted. Invalidates the quiz detail
// so the editor refreshes from the DB.
export const useApplyAIQuizEdit = (quizId: string) => {
  const queryClient = useQueryClient();
  return useMutation<ApplyQuizEditResponse, Error, ApplyQuizEditInput>({
    mutationFn: aiApi.applyQuizEdit,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
      toast.success(
        `${res.applied} change${res.applied > 1 ? "s" : ""} applied`,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
