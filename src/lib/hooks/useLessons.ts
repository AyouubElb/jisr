"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lessonKeys, sectionKeys, courseKeys } from "@/lib/constants/queryKeys";
import { lessonsApi } from "@/lib/api/lessons.api";
import { toast } from "sonner";
import type { LessonInsert, LessonUpdate } from "@/lib/types";

/** Single lesson */
export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: lessonKeys.detail(id ?? ""),
    queryFn: () => lessonsApi.detail(id!),
    enabled: !!id,
  });
}

/** Create lesson */
export function useCreateLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lesson: LessonInsert) => lessonsApi.create(lesson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Lecon ajoutee");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Update lesson */
export function useUpdateLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LessonUpdate }) =>
      lessonsApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: lessonKeys.detail(id) });
      toast.success("Lecon mise a jour");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Delete lesson */
export function useDeleteLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: lessonsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Lecon supprimee");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
