import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { UnmarkedSession } from "@/lib/api/attendance.api";

/** Server twin of attendanceApi.unmarkedForInstructor. */
export async function unmarkedForInstructorServer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UnmarkedSession[]> {
  const now = Date.now();

  const { data, error } = await supabase
    .from("live_sessions")
    .select("id, title, scheduled_at, duration_minutes, courses!inner(id, title, instructor_id), session_attendance(id)")
    .eq("courses.instructor_id", userId)
    .lt("scheduled_at", new Date(now).toISOString())
    .order("scheduled_at", { ascending: false });

  if (error) throw error;

  type Row = {
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    courses: { id: string; title: string };
    session_attendance: { id: string }[];
  };

  // "Unmarked" = the session has actually ended (scheduled_at + duration) and
  // has no attendance rows yet.
  return ((data ?? []) as unknown as Row[])
    .filter((s) => {
      const endMs = new Date(s.scheduled_at).getTime() + (s.duration_minutes ?? 0) * 60_000;
      return endMs <= now && (s.session_attendance?.length ?? 0) === 0;
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduled_at,
      durationMinutes: s.duration_minutes,
      courseId: s.courses.id,
      courseTitle: s.courses.title,
    }));
}
