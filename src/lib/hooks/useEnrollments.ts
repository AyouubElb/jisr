"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enrollmentKeys } from "@/lib/constants/queryKeys";
import { enrollmentsApi } from "@/lib/api/enrollments.api";
import { toast } from "sonner";

/** Current user's enrollments with course info (student view) */
export function useMyEnrollments() {
  return useQuery({
    queryKey: enrollmentKeys.mine(),
    queryFn: () => enrollmentsApi.listMine(),
  });
}

/** Enrollments for a specific course (instructor view) */
export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: enrollmentKeys.byCourse(courseId),
    queryFn: () => enrollmentsApi.listByCourse(courseId),
    enabled: !!courseId,
  });
}

/** All enrollments grouped by course, for the instructor students overview page */
export function useInstructorStudents() {
  return useQuery({
    queryKey: [...enrollmentKeys.all, "instructor-overview"],
    queryFn: () => enrollmentsApi.listForInstructor(),
  });
}

/** All students for the add-student picker (instructor only) */
export function useAllStudents() {
  return useQuery({
    queryKey: ["students", "all"],
    queryFn: () => enrollmentsApi.listAllStudents(),
  });
}

/** Add a student to a course (instructor only) */
export function useAddStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: string; studentId: string }) =>
      enrollmentsApi.addStudent(courseId, studentId),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.byCourse(courseId) });
      toast.success("Etudiant ajouté au cours");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

/** Remove a student from a course (instructor only) */
export function useRemoveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: string; studentId: string }) =>
      enrollmentsApi.removeStudent(courseId, studentId),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.byCourse(courseId) });
      toast.success("Etudiant retiré du cours");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
