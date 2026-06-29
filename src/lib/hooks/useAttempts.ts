"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attemptKeys, enrollmentKeys } from "@/lib/constants/queryKeys";
import { attemptsApi } from "@/lib/api/attempts.api";
import type { SubmittedAnswerInput } from "@/lib/api/attempts.api";
import { aiApi } from "@/lib/api/ai.api";
import type {
  GradeAttemptInput,
  GradeAttemptResponse,
} from "@/lib/api/ai.api";
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

/** Pending-count badge for the sidebar — invalidated on grade-submit */
export function usePendingGradingCount() {
  return useQuery({
    queryKey: attemptKeys.pendingCount(),
    queryFn: () => attemptsApi.pendingGradingCount(),
  });
}

/** Batch-save grades for every manual answer on one attempt; auto-finalizes if complete */
export function useGradeAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attemptsApi.gradeAttempt,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      toast.success("Grades saved");

      // Only when the attempt actually flipped to graded — notify the student
      // (+ email). Fire-and-forget: a notification failure must not surface as a
      // grading error.
      if (result.finalized) {
        void fetch("/api/notifications/quiz-corrected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: result.student_id,
            attempt_id: result.attempt_id,
            quiz_id: result.quiz_id,
            quiz_title: result.quiz_title,
            course_id: result.course_id,
            score: result.score,
          }),
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * AI suggestion pass — calls the student_grade agent on every free_text and
 * voice answer in one attempt. Writes ai_* columns only; the instructor still
 * has to accept or override before final_score moves.
 */
export function useGradeAttemptAI() {
  const queryClient = useQueryClient();

  return useMutation<GradeAttemptResponse, Error, GradeAttemptInput>({
    mutationFn: aiApi.gradeAttempt,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      const n = res.gradedBlockIds.length;
      if (n === 0) {
        toast.info("No answers for AI to grade");
        return;
      }
      toast.success(
        `AI: ${n} answer${n > 1 ? "s graded" : " graded"}. Review before saving.`,
      );
    },
    onError: (error) => {
      toast.error(`AI grading: ${error.message}`);
    },
  });
}
