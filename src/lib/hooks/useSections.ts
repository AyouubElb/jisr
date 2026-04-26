"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sectionKeys, courseKeys } from "@/lib/constants/queryKeys";
import { sectionsApi } from "@/lib/api/sections.api";
import { toast } from "sonner";
import type { SectionInsert, SectionUpdate } from "@/lib/types";

/** Sections for a course (with nested lessons + quizzes) */
export function useSections(courseId: string) {
  return useQuery({
    queryKey: sectionKeys.byCourse(courseId),
    queryFn: () => sectionsApi.listByCourse(courseId),
    enabled: !!courseId,
  });
}

/** Create section */
export function useCreateSection(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (section: SectionInsert) => sectionsApi.create(section),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Section ajoutee");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Update section */
export function useUpdateSection(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: SectionUpdate }) =>
      sectionsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Section mise a jour");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Delete section */
export function useDeleteSection(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sectionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Section supprimee");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
