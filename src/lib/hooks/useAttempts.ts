"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attemptKeys, enrollmentKeys } from "@/lib/constants/queryKeys";
import { attemptsApi } from "@/lib/api/attempts.api";
import type { SubmittedAnswerInput } from "@/lib/api/attempts.api";
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

/** Current student's attempts across every quiz in a course */
export function useMyCourseAttempts(courseId: string) {
  return useQuery({
    queryKey: attemptKeys.mineByCourse(courseId),
    queryFn: () => attemptsApi.listMineByCourse(courseId),
    enabled: !!courseId,
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

/** Start an attempt — creates in_progress row with started_at */
export function useStartAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => attemptsApi.start(quizId),
    onSuccess: (_, quizId) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.mine(quizId) });
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Submit a quiz — updates the in-progress attempt with graded answers */
export function useSubmitQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      quizId: _quizId,
      blocks,
      answers,
      courseId,
    }: {
      attemptId: string;
      quizId: string;
      blocks: QuizBlock[];
      answers: SubmittedAnswerInput[];
      courseId?: string;
    }) => {
      const attempt = await attemptsApi.submit(attemptId, blocks, answers);
      if (courseId) {
        await completionsApi.touchActivity(courseId).catch(() => undefined);
      }
      return attempt;
    },
    onSuccess: (_, { quizId, courseId }) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.mine(quizId) });
      queryClient.invalidateQueries({ queryKey: attemptKeys.byQuiz(quizId) });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: attemptKeys.mineByCourse(courseId) });
      }
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      toast.success("Quiz soumis");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
