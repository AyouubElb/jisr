import { createClient } from "@/lib/supabase/client";
import type { SessionAttendance } from "@/lib/types";

export interface SessionAttendanceRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  attendanceId: string | null;
  attended: boolean;
  marked: boolean;
  /** Absent on their last 2 marked sessions in this course (excluding this one) */
  recentAbsentStreak: boolean;
}

export interface UnmarkedSession {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  courseId: string;
  courseTitle: string;
}

export const attendanceApi = {
  /** One row per enrolled student, merged with any existing attendance state */
  listForSession: async (
    sessionId: string,
    courseId: string,
  ): Promise<SessionAttendanceRow[]> => {
    const supabase = createClient();

    const [enrollmentsRes, attendanceRes, historyRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, student_id, profiles(full_name)")
        .eq("course_id", courseId),
      supabase.from("session_attendance").select("*").eq("session_id", sessionId),
      supabase
        .from("session_attendance")
        .select("student_id, attended, live_sessions!inner(course_id, scheduled_at)")
        .eq("live_sessions.course_id", courseId)
        .neq("session_id", sessionId)
        .order("scheduled_at", { ascending: false, foreignTable: "live_sessions" }),
    ]);

    if (enrollmentsRes.error) throw enrollmentsRes.error;
    if (attendanceRes.error) throw attendanceRes.error;
    if (historyRes.error) throw historyRes.error;

    const byStudent = new Map(
      (attendanceRes.data ?? []).map((a) => [a.student_id, a]),
    );

    type HistoryRow = { student_id: string; attended: boolean };
    const streakByStudent = new Map<string, boolean>();
    const seenByStudent = new Map<string, HistoryRow[]>();
    for (const row of (historyRes.data ?? []) as unknown as HistoryRow[]) {
      const list = seenByStudent.get(row.student_id) ?? [];
      if (list.length < 2) list.push(row);
      seenByStudent.set(row.student_id, list);
    }
    for (const [sid, list] of seenByStudent) {
      streakByStudent.set(sid, list.length === 2 && list.every((r) => !r.attended));
    }

    return ((enrollmentsRes.data ?? []) as unknown as {
      id: string;
      student_id: string;
      profiles: { full_name: string };
    }[])
      .map((e) => {
        const existing = byStudent.get(e.student_id);
        return {
          enrollmentId: e.id,
          studentId: e.student_id,
          fullName: e.profiles?.full_name ?? "—",
          attendanceId: existing?.id ?? null,
          attended: existing?.attended ?? true,
          marked: !!existing,
          recentAbsentStreak: streakByStudent.get(e.student_id) ?? false,
        };
      })
      .sort((a, b) => {
        if (a.recentAbsentStreak !== b.recentAbsentStreak) {
          return a.recentAbsentStreak ? -1 : 1;
        }
        return a.fullName.localeCompare(b.fullName);
      });
  },

  /**
   * Past sessions across the instructor's courses that have no attendance row yet.
   * Used to drive the sidebar badge and the dashboard nudge.
   */
  unmarkedForInstructor: async (): Promise<UnmarkedSession[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();

    const { data, error } = await supabase
      .from("live_sessions")
      .select("id, title, scheduled_at, duration_minutes, courses!inner(id, title, instructor_id), session_attendance(id)")
      .eq("courses.instructor_id", user.id)
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

    // A session is "unmarked" only after it has actually ended
    // (scheduled_at + duration_minutes) and has no attendance rows yet.
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
  },

  /** Sidebar badge count — number of past sessions still needing attendance */
  unmarkedCount: async (): Promise<number> => {
    const rows = await attendanceApi.unmarkedForInstructor();
    return rows.length;
  },

  /** Upsert attendance for multiple students in one session */
  saveBatch: async (
    sessionId: string,
    rows: { studentId: string; attended: boolean }[],
  ): Promise<SessionAttendance[]> => {
    const supabase = createClient();
    const payload = rows.map((r) => ({
      session_id: sessionId,
      student_id: r.studentId,
      attended: r.attended,
      marked_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("session_attendance")
      .upsert(payload, { onConflict: "session_id,student_id" })
      .select();

    if (error) throw error;
    return data;
  },
};
