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
    finalScore: number | null;
    autoScore: number | null;
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

export interface RecentActivityItem {
  id: string;
  type: "lesson_completed" | "quiz_submitted";
  studentName: string;
  studentId: string;
  label: string;
  courseTitle: string;
  courseId: string;
  timestamp: string;
}

export const engagementApi = {
  /** Recent student activity across all instructor's courses (last 10 events) */
  recentActivity: async (): Promise<RecentActivityItem[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const [completionsRes, attemptsRes] = await Promise.all([
      supabase
        .from("lesson_completions")
        .select("id, completed_at, student_id, profiles(full_name), lessons!inner(title, section_id, sections!inner(course_id, courses!inner(id, title, instructor_id)))")
        .eq("lessons.sections.courses.instructor_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(20),
      supabase
        .from("student_attempts")
        .select("id, submitted_at, student_id, status, profiles!student_attempts_student_id_fkey(full_name), quizzes!inner(title, section_id, sections!inner(course_id, courses!inner(id, title, instructor_id)))")
        .eq("quizzes.sections.courses.instructor_id", user.id)
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
  },
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
          .select("id, quiz_id, auto_score, final_score, status, submitted_at, quizzes!inner(title, sections!inner(course_id))")
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
          finalScore: a.final_score,
          autoScore: a.auto_score,
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
