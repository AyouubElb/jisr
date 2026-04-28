"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completionKeys, enrollmentKeys } from "@/lib/constants/queryKeys";
import { completionsApi } from "@/lib/api/completions.api";
import { toast } from "sonner";

/** Current student's completions for one course */
export function useMyCompletions(courseId: string) {
  return useQuery({
    queryKey: completionKeys.mineByCourse(courseId),
    queryFn: () => completionsApi.listMineByCourse(courseId),
    enabled: !!courseId,
  });
}

/** All completions in a course (instructor) */
export function useCourseCompletions(courseId: string) {
  return useQuery({
    queryKey: completionKeys.byCourse(courseId),
    queryFn: () => completionsApi.listByCourse(courseId),
    enabled: !!courseId,
  });
}

/** Mark a lesson complete + bump activity */
export function useMarkLessonComplete(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const completion = await completionsApi.markComplete(lessonId);
      await completionsApi.touchActivity(courseId);
      return completion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: completionKeys.mineByCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      toast.success("Leçon terminée !");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.info("Déjà complétée");
        return;
      }
      toast.error("Impossible de sauvegarder. Veuillez réessayer.");
    },
  });
}

/** Un-mark a lesson */
export function useUnmarkLessonComplete(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => completionsApi.unmarkComplete(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: completionKeys.mineByCourse(courseId) });
    },
    onError: () => {
      toast.error("Impossible de sauvegarder. Veuillez réessayer.");
    },
  });
}
