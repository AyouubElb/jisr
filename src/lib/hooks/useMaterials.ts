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

/** Upload a file */
export function useUploadMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      courseId,
      lessonId,
    }: {
      file: File;
      courseId: string;
      lessonId: string;
    }) => materialsApi.upload(file, { courseId, lessonId }),
    onSuccess: (material) => {
      if (material.lesson_id) {
        queryClient.invalidateQueries({
          queryKey: materialKeys.byLesson(material.lesson_id),
        });
      }
      toast.success("Document added");
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
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
    }) => materialsApi.delete(id, fileUrl),
    onSuccess: (_, { lessonId }) => {
      if (lessonId) {
        queryClient.invalidateQueries({
          queryKey: materialKeys.byLesson(lessonId),
        });
      }
      toast.success("Document deleted");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

/** Get signed URL for download */
export function useSignedUrl() {
  return useMutation({
    mutationFn: (path: string) => materialsApi.getSignedUrl(path),
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
