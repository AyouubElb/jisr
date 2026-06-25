import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export interface InstructorCourseRoster {
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
}

/** Server twin of enrollmentsApi.listForInstructor. */
export async function listForInstructorServer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<InstructorCourseRoster[]> {
  // Pull all enrollments (even removed) then filter in code, so courses with no
  // active enrollments still surface with an empty roster.
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, level, enrollments(id, student_id, enrolled_at, last_active_at, removed_at, profiles(full_name, avatar_url))",
    )
    .eq("instructor_id", userId)
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
}
