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
      toast.success("Presence enregistree");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
