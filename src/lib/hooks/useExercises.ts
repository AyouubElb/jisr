"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sectionKeys, courseKeys } from "@/lib/constants/queryKeys";
import { exercisesApi } from "@/lib/api/exercises.api";
import { toast } from "sonner";
import type { ExerciseInsert, ExerciseUpdate } from "@/lib/types";

/** Create exercise */
export function useCreateExercise(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exercise: ExerciseInsert) => exercisesApi.create(exercise),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Exercice ajoute");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Update exercise */
export function useUpdateExercise(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ExerciseUpdate }) =>
      exercisesApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Exercice mis a jour");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Delete exercise */
export function useDeleteExercise(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exercisesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Exercice supprime");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
