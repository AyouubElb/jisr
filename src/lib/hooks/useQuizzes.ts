"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quizKeys, sectionKeys, courseKeys } from "@/lib/constants/queryKeys";
import { quizzesApi } from "@/lib/api/quizzes.api";
import { toast } from "sonner";
import type { QuizInsert, QuizUpdate, QuizBlockInsert } from "@/lib/types";

/** Fetch a single quiz with blocks */
export function useQuiz(id: string) {
  return useQuery({
    queryKey: quizKeys.detail(id),
    queryFn: () => quizzesApi.detail(id),
    enabled: !!id,
  });
}

/** Create quiz */
export function useCreateQuiz(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quiz: QuizInsert) => quizzesApi.create(quiz),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Quiz ajoute");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Update quiz */
export function useUpdateQuiz(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: QuizUpdate }) =>
      quizzesApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.detail(id) });
      toast.success("Quiz mis a jour");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/**
 * Duplicate quiz — composes existing APIs (detail → create → saveBlocks).
 * Caller passes nextOrder from the already-cached sections data.
 */
export function useDuplicateQuiz(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      nextOrder,
    }: {
      id: string;
      nextOrder: number;
    }) => {
      const source = await quizzesApi.detail(id);

      const copy = await quizzesApi.create({
        section_id: source.section_id,
        title: `${source.title} (copie)`,
        description: source.description,
        time_limit_minutes: source.time_limit_minutes,
        order: nextOrder,
      });

      const blocks = source.quiz_blocks
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          type: b.type,
          content: b.content,
          weight: b.weight,
          order: b.order,
        }));

      if (blocks.length > 0) {
        await quizzesApi.saveBlocks(copy.id, blocks);
      }

      return copy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Quiz duplique");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Delete quiz */
export function useDeleteQuiz(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quizzesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Quiz supprime");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Save all blocks for a quiz (replaces existing) */
export function useSaveQuizBlocks(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      blocks,
    }: {
      quizId: string;
      blocks: Omit<QuizBlockInsert, "quiz_id">[];
    }) => quizzesApi.saveBlocks(quizId, blocks),
    onSuccess: (_, { quizId }) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      toast.success("Blocs du quiz enregistres");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
