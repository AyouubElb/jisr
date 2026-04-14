"use client";

import { useQuery } from "@tanstack/react-query";
import { engagementApi } from "@/lib/api/engagement.api";

export function useStudentEngagement(studentId: string, courseId: string) {
  return useQuery({
    queryKey: ["engagement", "student", studentId, "course", courseId],
    queryFn: () => engagementApi.studentOverview(studentId, courseId),
    enabled: !!studentId && !!courseId,
  });
}
