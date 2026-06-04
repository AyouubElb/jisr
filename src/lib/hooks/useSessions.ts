"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionKeys, courseKeys } from "@/lib/constants/queryKeys";
import { sessionsApi } from "@/lib/api/sessions.api";
import { toast } from "sonner";
import type { LiveSessionInsert, LiveSessionUpdate } from "@/lib/types";

/** Sessions for a course */
export function useSessions(courseId: string) {
  return useQuery({
    queryKey: sessionKeys.byCourse(courseId),
    queryFn: () => sessionsApi.listByCourse(courseId),
    enabled: !!courseId,
  });
}

/** Upcoming sessions across all courses */
export function useUpcomingSessions() {
  return useQuery({
    queryKey: sessionKeys.upcoming(),
    queryFn: () => sessionsApi.listUpcoming(),
  });
}

/** All sessions across the instructor's courses */
export function useInstructorSessions() {
  return useQuery({
    queryKey: sessionKeys.instructorAll(),
    queryFn: () => sessionsApi.listInstructorAll(),
  });
}

/** All sessions from courses the student is enrolled in */
export function useStudentSessions() {
  return useQuery({
    queryKey: sessionKeys.studentAll(),
    queryFn: () => sessionsApi.listStudentAll(),
  });
}

/** Create session */
export function useCreateSession(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (session: LiveSessionInsert) => sessionsApi.create(session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Session created");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/** Update session */
export function useUpdateSession(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LiveSessionUpdate }) =>
      sessionsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Session updated");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/** Delete session */
export function useDeleteSession(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      toast.success("Session deleted");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
