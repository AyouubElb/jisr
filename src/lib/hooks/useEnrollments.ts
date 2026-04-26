"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enrollmentKeys } from "@/lib/constants/queryKeys";
import { enrollmentsApi } from "@/lib/api/enrollments.api";
import { toast } from "sonner";
import type { CreateStudentInput } from "@/lib/schemas/auth.schema";

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStudentInput): Promise<{ password: string }> => {
      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...enrollmentKeys.all, "instructor-overview"] });
      queryClient.invalidateQueries({ queryKey: ["students", "all"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

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
    onSuccess: (_, { studentId, courseId }) => {
      // Catches byCourse, mine, and instructor-overview in one shot.
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      // Engagement panel for this (student, course) may now show fresh data.
      queryClient.invalidateQueries({
        queryKey: ["engagement", "student", studentId, "course", courseId],
      });
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
    onSuccess: (_, { studentId, courseId }) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      queryClient.invalidateQueries({
        queryKey: ["engagement", "student", studentId, "course", courseId],
      });
      toast.success("Etudiant retiré du cours");
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
