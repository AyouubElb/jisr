"use client";

import { useQuery } from "@tanstack/react-query";
import { engagementKeys } from "@/lib/constants/queryKeys";
import { engagementApi } from "@/lib/api/engagement.api";

export function useStudentEngagement(studentId: string, courseId: string) {
  return useQuery({
    queryKey: ["engagement", "student", studentId, "course", courseId],
    queryFn: () => engagementApi.studentOverview(studentId, courseId),
    enabled: !!studentId && !!courseId,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: engagementKeys.recentActivity(),
    queryFn: () => engagementApi.recentActivity(),
  });
}
