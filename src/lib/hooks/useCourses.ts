"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseKeys } from "@/lib/constants/queryKeys";
import { coursesApi } from "@/lib/api/courses.api";
import { toast } from "sonner";
import type { CEFRLevel, CourseInsert, CourseUpdate } from "@/lib/types";

/** Published courses (student view) */
export function useCourses(level?: CEFRLevel) {
  return useQuery({
    queryKey: courseKeys.list({ level }),
    queryFn: () => coursesApi.list(level),
  });
}

/** Instructor's own courses (all, including drafts) */
export function useMyCourses() {
  return useQuery({
    queryKey: courseKeys.list({ level: "__mine__" }),
    queryFn: () => coursesApi.listMine(),
  });
}

/** Single course with lessons + sessions */
export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => coursesApi.detail(id),
    enabled: !!id,
  });
}

/** Create course */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (course: CourseInsert) => coursesApi.create(course),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      toast.success("Cours cree avec succes");
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la creation du cours : ${error.message}`);
    },
  });
}

/** Update course */
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CourseUpdate }) =>
      coursesApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
      toast.success("Cours mis a jour");
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la mise a jour : ${error.message}`);
    },
  });
}

/** Delete course */
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coursesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      toast.success("Cours supprime");
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression : ${error.message}`);
    },
  });
}
