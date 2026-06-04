"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionKeys } from "@/lib/constants/queryKeys";
import { questionsApi } from "@/lib/api/questions.api";
import { toast } from "sonner";
import type {
  CourseQuestionInsert,
  CourseQuestionReplyInsert,
  QuestionStatus,
} from "@/lib/types";

/** All questions for a course */
export function useCourseQuestions(courseId: string) {
  return useQuery({
    queryKey: questionKeys.byCourse(courseId),
    queryFn: () => questionsApi.listByCourse(courseId),
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

/** Single thread with replies */
export function useQuestionThread(questionId: string | null) {
  return useQuery({
    queryKey: questionKeys.detail(questionId ?? ""),
    queryFn: () => questionsApi.getThread(questionId!),
    enabled: !!questionId,
    staleTime: 15_000,
  });
}

/** Student creates a question */
export function useCreateQuestion(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CourseQuestionInsert) => questionsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: questionKeys.byCourse(courseId),
      });
      toast.success("Question envoyée");
    },
    onError: () => {
      toast.error("Impossible d'envoyer la question. Veuillez réessayer.");
    },
  });
}

/** Reply to a thread (student or instructor) */
export function useReplyToQuestion(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CourseQuestionReplyInsert) => questionsApi.reply(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: questionKeys.detail(variables.question_id),
      });
      queryClient.invalidateQueries({
        queryKey: questionKeys.byCourse(courseId),
      });
    },
    onError: () => {
      toast.error("Impossible d'envoyer la réponse. Veuillez réessayer.");
    },
  });
}

/** Mark a question open/resolved */
export function useSetQuestionStatus(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      status,
    }: {
      questionId: string;
      status: QuestionStatus;
    }) => questionsApi.setStatus(questionId, status),
    onSuccess: (_data, { questionId, status }) => {
      queryClient.invalidateQueries({
        queryKey: questionKeys.detail(questionId),
      });
      queryClient.invalidateQueries({
        queryKey: questionKeys.byCourse(courseId),
      });
      toast.success(
        status === "resolved" ? "Marked as resolved" : "Reopened",
      );
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/** Delete a thread */
export function useDeleteQuestion(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionId: string) => questionsApi.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: questionKeys.byCourse(courseId),
      });
      toast.success("Question deleted");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
