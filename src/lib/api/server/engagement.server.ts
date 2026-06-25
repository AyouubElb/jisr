import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { RecentActivityItem } from "@/lib/api/engagement.api";

/** Server twin of engagementApi.recentActivity. */
export async function recentActivityServer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RecentActivityItem[]> {
  const [completionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("lesson_completions")
      .select("id, completed_at, student_id, profiles(full_name), lessons!inner(title, section_id, sections!inner(course_id, courses!inner(id, title, instructor_id)))")
      .eq("lessons.sections.courses.instructor_id", userId)
      .order("completed_at", { ascending: false })
      .limit(20),
    supabase
      .from("student_attempts")
      .select("id, submitted_at, student_id, status, profiles!student_attempts_student_id_fkey(full_name), quizzes!inner(title, section_id, sections!inner(course_id, courses!inner(id, title, instructor_id)))")
      .eq("quizzes.sections.courses.instructor_id", userId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(20),
  ]);

  if (completionsRes.error) throw completionsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  const items: RecentActivityItem[] = [];

  for (const c of completionsRes.data ?? []) {
    const row = c as unknown as {
      id: string;
      completed_at: string;
      student_id: string;
      profiles: { full_name: string };
      lessons: { title: string; sections: { courses: { id: string; title: string } } };
    };
    items.push({
      id: row.id,
      type: "lesson_completed",
      studentName: row.profiles?.full_name ?? "—",
      studentId: row.student_id,
      label: row.lessons?.title ?? "—",
      courseTitle: row.lessons?.sections?.courses?.title ?? "—",
      courseId: row.lessons?.sections?.courses?.id ?? "",
      timestamp: row.completed_at,
    });
  }

  for (const a of attemptsRes.data ?? []) {
    const row = a as unknown as {
      id: string;
      submitted_at: string;
      student_id: string;
      profiles: { full_name: string };
      quizzes: { title: string; sections: { courses: { id: string; title: string } } };
    };
    items.push({
      id: row.id,
      type: "quiz_submitted",
      studentName: row.profiles?.full_name ?? "—",
      studentId: row.student_id,
      label: row.quizzes?.title ?? "—",
      courseTitle: row.quizzes?.sections?.courses?.title ?? "—",
      courseId: row.quizzes?.sections?.courses?.id ?? "",
      timestamp: row.submitted_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
}
