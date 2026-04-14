"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialKeys } from "@/lib/constants/queryKeys";
import { materialsApi } from "@/lib/api/materials.api";
import { toast } from "sonner";

/** Materials for a lesson */
export function useLessonMaterials(lessonId: string | undefined) {
  return useQuery({
    queryKey: materialKeys.byLesson(lessonId!),
    queryFn: () => materialsApi.listByLesson(lessonId!),
    enabled: !!lessonId,
  });
}

/** Materials for an exercise */
export function useExerciseMaterials(exerciseId: string | undefined) {
  return useQuery({
    queryKey: materialKeys.byExercise(exerciseId!),
    queryFn: () => materialsApi.listByExercise(exerciseId!),
    enabled: !!exerciseId,
  });
}

/** Upload a file */
export function useUploadMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      courseId,
      lessonId,
      exerciseId,
    }: {
      file: File;
      courseId: string;
      lessonId?: string;
      exerciseId?: string;
    }) => materialsApi.upload(file, { courseId, lessonId, exerciseId }),
    onSuccess: (material) => {
      if (material.lesson_id) {
        queryClient.invalidateQueries({
          queryKey: materialKeys.byLesson(material.lesson_id),
        });
      }
      if (material.exercise_id) {
        queryClient.invalidateQueries({
          queryKey: materialKeys.byExercise(material.exercise_id),
        });
      }
      toast.success("Document ajoute");
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de l'envoi : ${error.message}`);
    },
  });
}

/** Delete a material */
export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      fileUrl,
    }: {
      id: string;
      fileUrl: string;
      lessonId?: string;
      exerciseId?: string;
    }) => materialsApi.delete(id, fileUrl),
    onSuccess: (_, { lessonId, exerciseId }) => {
      if (lessonId) {
        queryClient.invalidateQueries({
          queryKey: materialKeys.byLesson(lessonId),
        });
      }
      if (exerciseId) {
        queryClient.invalidateQueries({
          queryKey: materialKeys.byExercise(exerciseId),
        });
      }
      toast.success("Document supprime");
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression : ${error.message}`);
    },
  });
}

/** Get signed URL for download */
export function useSignedUrl() {
  return useMutation({
    mutationFn: (path: string) => materialsApi.getSignedUrl(path),
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
