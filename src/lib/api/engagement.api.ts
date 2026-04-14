import { createClient } from "@/lib/supabase/client";

export interface StudentEngagementOverview {
  student: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  course: {
    id: string;
    title: string;
    level: string;
  };
  enrollment: {
    enrolledAt: string;
    lastActiveAt: string | null;
  } | null;
  totals: {
    lessonCount: number;
    quizCount: number;
    sessionCount: number;
  };
  completedLessonIds: string[];
  attempts: {
    id: string;
    quizId: string;
    quizTitle: string;
    score: number | null;
    maxScore: number | null;
    status: string;
    submittedAt: string | null;
  }[];
  attendance: {
    sessionId: string;
    sessionTitle: string;
    scheduledAt: string;
    attended: boolean | null;
  }[];
}

export const engagementApi = {
  /** Engagement overview for one student inside one course (instructor view) */
  studentOverview: async (
    studentId: string,
    courseId: string,
  ): Promise<StudentEngagementOverview> => {
    const supabase = createClient();

    const [courseRes, profileRes, enrollmentRes, completionsRes, attemptsRes, attendanceRes] =
      await Promise.all([
        supabase
          .from("courses")
          .select("id, title, level, sections(id, lessons(id), quizzes(id, title)), live_sessions(id, title, scheduled_at)")
          .eq("id", courseId)
          .single(),
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", studentId).single(),
        supabase
          .from("enrollments")
          .select("enrolled_at, last_active_at")
          .eq("course_id", courseId)
          .eq("student_id", studentId)
          .maybeSingle(),
        supabase
          .from("lesson_completions")
          .select("lesson_id, lessons!inner(section_id, sections!inner(course_id))")
          .eq("student_id", studentId)
          .eq("lessons.sections.course_id", courseId),
        supabase
          .from("student_attempts")
          .select("id, quiz_id, score, max_score, status, submitted_at, quizzes!inner(title, sections!inner(course_id))")
          .eq("student_id", studentId)
          .eq("quizzes.sections.course_id", courseId)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("session_attendance")
          .select("session_id, attended, live_sessions!inner(title, scheduled_at, course_id)")
          .eq("student_id", studentId)
          .eq("live_sessions.course_id", courseId),
      ]);

    if (courseRes.error) throw courseRes.error;
    if (profileRes.error) throw profileRes.error;
    if (completionsRes.error) throw completionsRes.error;
    if (attemptsRes.error) throw attemptsRes.error;
    if (attendanceRes.error) throw attendanceRes.error;

    const course = courseRes.data as unknown as {
      id: string;
      title: string;
      level: string;
      sections: { id: string; lessons: { id: string }[]; quizzes: { id: string; title: string }[] }[];
      live_sessions: { id: string; title: string; scheduled_at: string }[];
    };

    const lessonCount = course.sections.reduce((s, sec) => s + (sec.lessons?.length ?? 0), 0);
    const quizCount = course.sections.reduce((s, sec) => s + (sec.quizzes?.length ?? 0), 0);
    const sessionCount = course.live_sessions?.length ?? 0;

    return {
      student: {
        id: profileRes.data.id,
        fullName: profileRes.data.full_name,
        avatarUrl: profileRes.data.avatar_url,
      },
      course: { id: course.id, title: course.title, level: course.level },
      enrollment: enrollmentRes.data
        ? {
            enrolledAt: enrollmentRes.data.enrolled_at,
            lastActiveAt: enrollmentRes.data.last_active_at,
          }
        : null,
      totals: { lessonCount, quizCount, sessionCount },
      completedLessonIds: (completionsRes.data ?? []).map((c) => c.lesson_id),
      attempts: (attemptsRes.data ?? []).map((a) => {
        const q = (a as unknown as { quizzes: { title: string } }).quizzes;
        return {
          id: a.id,
          quizId: a.quiz_id,
          quizTitle: q?.title ?? "—",
          score: a.score,
          maxScore: a.max_score,
          status: a.status,
          submittedAt: a.submitted_at,
        };
      }),
      attendance: (attendanceRes.data ?? []).map((row) => {
        const ls = (row as unknown as {
          live_sessions: { title: string; scheduled_at: string };
        }).live_sessions;
        return {
          sessionId: row.session_id,
          sessionTitle: ls?.title ?? "—",
          scheduledAt: ls?.scheduled_at ?? "",
          attended: row.attended,
        };
      }),
    };
  },
};
