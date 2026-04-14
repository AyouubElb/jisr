import { createClient } from "@/lib/supabase/client";
import type { Enrollment, CourseWithInstructor } from "@/lib/types";

export const enrollmentsApi = {
  /** List current user's enrollments with course details (student view) */
  listMine: async (): Promise<(Enrollment & { courses: CourseWithInstructor })[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, courses(*, profiles(full_name, avatar_url))")
      .order("enrolled_at", { ascending: false });

    if (error) throw error;
    return data as unknown as (Enrollment & { courses: CourseWithInstructor })[];
  },

  /** List enrollments for a specific course (instructor view) */
  listByCourse: async (courseId: string): Promise<(Enrollment & { profiles: { full_name: string; avatar_url: string | null } })[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false });

    if (error) throw error;
    return data as unknown as (Enrollment & { profiles: { full_name: string; avatar_url: string | null } })[];
  },

  /** All enrollments across instructor's own courses — returns courses with nested students */
  listForInstructor: async (): Promise<
    {
      courseId: string;
      courseTitle: string;
      courseLevel: string;
      students: {
        enrollmentId: string;
        studentId: string;
        fullName: string;
        avatarUrl: string | null;
        enrolledAt: string;
        lastActiveAt: string | null;
      }[];
    }[]
  > => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("courses")
      .select("id, title, level, enrollments(id, student_id, enrolled_at, last_active_at, profiles(full_name, avatar_url))")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((course) => ({
      courseId: course.id,
      courseTitle: course.title,
      courseLevel: course.level,
      students: ((course.enrollments ?? []) as unknown as {
        id: string;
        student_id: string;
        enrolled_at: string;
        last_active_at: string | null;
        profiles: { full_name: string; avatar_url: string | null };
      }[]).map((e) => ({
        enrollmentId: e.id,
        studentId: e.student_id,
        fullName: e.profiles?.full_name ?? "—",
        avatarUrl: e.profiles?.avatar_url ?? null,
        enrolledAt: e.enrolled_at,
        lastActiveAt: e.last_active_at,
      })),
    }));
  },

  /** List all students (instructor use — to pick students to enroll) */
  listAllStudents: async (): Promise<{ id: string; full_name: string }[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "student")
      .order("full_name");

    if (error) throw error;
    return data ?? [];
  },

  /** Add a student to a course (instructor only — course must be published) */
  addStudent: async (courseId: string, studentId: string): Promise<void> => {
    const supabase = createClient();

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("is_published")
      .eq("id", courseId)
      .single();

    if (courseError) throw courseError;
    if (!course?.is_published) {
      throw new Error("Publiez le cours avant d'inscrire des etudiants");
    }

    const { error } = await supabase
      .from("enrollments")
      .insert({ student_id: studentId, course_id: courseId });

    if (error) throw error;
  },

  /** Remove a student from a course (instructor only) */
  removeStudent: async (courseId: string, studentId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("course_id", courseId)
      .eq("student_id", studentId);

    if (error) throw error;
  },
};
