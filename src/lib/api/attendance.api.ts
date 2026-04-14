import { createClient } from "@/lib/supabase/client";
import type { SessionAttendance } from "@/lib/types";

export interface SessionAttendanceRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  attendanceId: string | null;
  attended: boolean;
  marked: boolean;
}

export const attendanceApi = {
  /** One row per enrolled student, merged with any existing attendance state */
  listForSession: async (
    sessionId: string,
    courseId: string,
  ): Promise<SessionAttendanceRow[]> => {
    const supabase = createClient();

    const [enrollmentsRes, attendanceRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, student_id, profiles(full_name)")
        .eq("course_id", courseId),
      supabase.from("session_attendance").select("*").eq("session_id", sessionId),
    ]);

    if (enrollmentsRes.error) throw enrollmentsRes.error;
    if (attendanceRes.error) throw attendanceRes.error;

    const byStudent = new Map(
      (attendanceRes.data ?? []).map((a) => [a.student_id, a]),
    );

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
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
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
