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
    onError: () => {
      toast.error("Impossible de démarrer le quiz. Veuillez réessayer.");
    },
  });
}

/** Submit a quiz — updates the in-progress attempt with graded answers */
export function useSubmitQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
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
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      toast.success("Quiz envoyé !");
    },
    onError: () => {
      toast.error("Impossible d'envoyer le quiz. Veuillez réessayer.");
    },
  });
}

// ── Student "mes notes" history ───────────────────────────────────

/** Every submitted attempt of the current student, across all courses */
export function useMyAllAttempts() {
  return useQuery({
    queryKey: attemptKeys.mineAll(),
    queryFn: () => attemptsApi.listMine(),
  });
}

/** Full attempt detail for the student review page */
export function useMyAttemptReview(attemptId: string) {
  return useQuery({
    queryKey: attemptKeys.mineReview(attemptId),
    queryFn: () => attemptsApi.mineReview(attemptId),
    enabled: !!attemptId,
  });
}

// ── Instructor grading inbox ───────────────────────────────────────

/** Grading inbox feed — one row per manual answer matching the filter */
export function useGradingInbox(filter: "pending" | "all" | "graded") {
  return useQuery({
    queryKey: attemptKeys.inbox(filter),
    queryFn: () => attemptsApi.listGradingInbox(filter),
  });
}

/** Pending-count badge for the sidebar */
export function usePendingGradingCount() {
  return useQuery({
    queryKey: attemptKeys.pendingCount(),
    queryFn: () => attemptsApi.pendingGradingCount(),
    // Refresh every minute so the badge stays roughly current while the
    // instructor is on other pages
    refetchInterval: 60_000,
  });
}

/** Batch-save grades for every manual answer on one attempt; auto-finalizes if complete */
export function useGradeAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attemptsApi.gradeAttempt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      toast.success("Notes enregistrees");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
