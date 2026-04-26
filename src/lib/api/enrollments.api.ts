import { createClient } from "@/lib/supabase/client";
import type { Enrollment, CourseWithInstructor } from "@/lib/types";

export const enrollmentsApi = {
  /** List current user's enrollments with course details (student view) — active only */
  listMine: async (): Promise<(Enrollment & { courses: CourseWithInstructor })[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, courses(*, profiles(full_name, avatar_url))")
      .is("removed_at", null)
      .order("enrolled_at", { ascending: false });

    if (error) throw error;
    return data as unknown as (Enrollment & { courses: CourseWithInstructor })[];
  },

  /** List enrollments for a specific course (instructor view) — active only */
  listByCourse: async (courseId: string): Promise<(Enrollment & { profiles: { full_name: string; avatar_url: string | null } })[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("course_id", courseId)
      .is("removed_at", null)
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

    // Pull all enrollments (even removed) then filter client-side. Doing the
    // filter via a Supabase relation filter would also drop courses with no
    // active enrollments, which we still want to show with an empty roster.
    const { data, error } = await supabase
      .from("courses")
      .select(
        "id, title, level, enrollments(id, student_id, enrolled_at, last_active_at, removed_at, profiles(full_name, avatar_url))",
      )
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
        removed_at: string | null;
        profiles: { full_name: string; avatar_url: string | null };
      }[])
        .filter((e) => e.removed_at === null)
        .map((e) => ({
          enrollmentId: e.id,
          studentId: e.student_id,
          fullName: e.profiles?.full_name ?? "—",
          avatarUrl: e.profiles?.avatar_url ?? null,
          enrolledAt: e.enrolled_at,
          lastActiveAt: e.last_active_at,
        })),
    }));
  },

  /** List the current instructor's own students (their roster — to pick students to enroll) */
  listAllStudents: async (): Promise<{ id: string; full_name: string }[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("instructor_students")
      .select("profiles:student_id(id, full_name)")
      .eq("instructor_id", user.id);

    if (error) throw error;
    return ((data ?? []) as unknown as { profiles: { id: string; full_name: string } | null }[])
      .map((row) => row.profiles)
      .filter((p): p is { id: string; full_name: string } => p !== null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  },

  /**
   * Add a student to a course (instructor only — course must be published).
   *
   * Soft-remove model: if a (possibly removed) enrollment row already exists
   * for this (student, course), reactivate it by clearing removed_at. This
   * preserves last_active_at and the original enrolled_at — so the student's
   * historical activity stays accurate. Otherwise insert a new row.
   */
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

    // Look for any existing enrollment (active or removed) — UNIQUE
    // (student_id, course_id) means there is at most one.
    const { data: existing, error: existingError } = await supabase
      .from("enrollments")
      .select("id, removed_at")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      if (existing.removed_at === null) return; // already active
      const { error } = await supabase
        .from("enrollments")
        .update({ removed_at: null })
        .eq("id", existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("enrollments")
      .insert({ student_id: studentId, course_id: courseId });
    if (error) throw error;
  },

  /**
   * Remove a student from a course (instructor only) — SOFT remove.
   *
   * Sets removed_at = NOW() instead of deleting the row. The student loses
   * access via RLS but their attempts/completions/attendance and prior
   * last_active_at are preserved for re-enrollment continuity.
   */
  removeStudent: async (courseId: string, studentId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("enrollments")
      .update({ removed_at: new Date().toISOString() })
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .is("removed_at", null);

    if (error) throw error;
  },
};
