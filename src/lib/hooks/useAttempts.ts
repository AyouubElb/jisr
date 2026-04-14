"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attemptKeys, enrollmentKeys } from "@/lib/constants/queryKeys";
import { attemptsApi, type SubmittedAnswerInput } from "@/lib/api/attempts.api";
import { completionsApi } from "@/lib/api/completions.api";
import { toast } from "sonner";
import type { QuizBlock } from "@/lib/types";

/** Current student's attempts for a given quiz */
export function useMyAttempts(quizId: string) {
  return useQuery({
    queryKey: attemptKeys.mine(quizId),
    queryFn: () => attemptsApi.listMineByQuiz(quizId),
    enabled: !!quizId,
  });
}

/** Single attempt with answers */
export function useAttempt(attemptId: string) {
  return useQuery({
    queryKey: attemptKeys.detail(attemptId),
    queryFn: () => attemptsApi.detail(attemptId),
    enabled: !!attemptId,
  });
}

/** Submit a quiz — creates attempt + answers + grades automatically */
export function useSubmitQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizId,
      blocks,
      answers,
      courseId,
    }: {
      quizId: string;
      blocks: QuizBlock[];
      answers: SubmittedAnswerInput[];
      courseId?: string;
    }) => {
      const attempt = await attemptsApi.submit(quizId, blocks, answers);
      if (courseId) {
        await completionsApi.touchActivity(courseId).catch(() => undefined);
      }
      return attempt;
    },
    onSuccess: (_, { quizId }) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.mine(quizId) });
      queryClient.invalidateQueries({ queryKey: attemptKeys.byQuiz(quizId) });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      toast.success("Quiz soumis");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
