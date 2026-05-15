"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceKeys } from "@/lib/constants/queryKeys";
import { attendanceApi } from "@/lib/api/attendance.api";
import { toast } from "sonner";

export function useSessionAttendance(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: attendanceKeys.bySession(sessionId),
    queryFn: () => attendanceApi.listForSession(sessionId, courseId),
    enabled: !!sessionId && !!courseId,
  });
}

export function useSaveAttendance(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: { studentId: string; attended: boolean }[]) =>
      attendanceApi.saveBatch(sessionId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.bySession(sessionId) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.unmarked() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.unmarkedCount() });
      toast.success("Attendance saved");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/** Past sessions across the instructor's courses still needing attendance */
export function useUnmarkedSessions() {
  return useQuery({
    queryKey: attendanceKeys.unmarked(),
    queryFn: () => attendanceApi.unmarkedForInstructor(),
  });
}

/** Sidebar badge — count of unmarked past sessions. Refetches every 5 min
 *  in the background; React Query also refetches on tab focus by default. */
export function useUnmarkedAttendanceCount() {
  return useQuery({
    queryKey: attendanceKeys.unmarkedCount(),
    queryFn: () => attendanceApi.unmarkedCount(),
    refetchInterval: 5 * 60_000,
  });
}
