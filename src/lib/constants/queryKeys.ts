export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (filters: { level?: string }) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
};

export const sessionKeys = {
  all: ["sessions"] as const,
  byCourse: (courseId: string) => [...sessionKeys.all, "course", courseId] as const,
  upcoming: () => [...sessionKeys.all, "upcoming"] as const,
  instructorAll: () => [...sessionKeys.all, "instructor-all"] as const,
  studentAll: () => [...sessionKeys.all, "student-all"] as const,
};

export const enrollmentKeys = {
  all: ["enrollments"] as const,
  mine: () => [...enrollmentKeys.all, "mine"] as const,
  byCourse: (courseId: string) => [...enrollmentKeys.all, "course", courseId] as const,
};

export const sectionKeys = {
  all: ["sections"] as const,
  byCourse: (courseId: string) => [...sectionKeys.all, "course", courseId] as const,
};

export const lessonKeys = {
  all: ["lessons"] as const,
  bySection: (sectionId: string) => [...lessonKeys.all, "section", sectionId] as const,
  details: () => [...lessonKeys.all, "detail"] as const,
  detail: (id: string) => [...lessonKeys.details(), id] as const,
  audio: (id: string) => [...lessonKeys.all, "audio", id] as const,
};

export const materialKeys = {
  all: ["materials"] as const,
  byLesson: (lessonId: string) => [...materialKeys.all, "lesson", lessonId] as const,
};

export const quizKeys = {
  all: ["quizzes"] as const,
  bySection: (sectionId: string) => [...quizKeys.all, "section", sectionId] as const,
  detail: (id: string) => [...quizKeys.all, "detail", id] as const,
};

export const attemptKeys = {
  all: ["attempts"] as const,
  byQuiz: (quizId: string) => [...attemptKeys.all, "quiz", quizId] as const,
  mine: (quizId: string) => [...attemptKeys.all, "mine", quizId] as const,
  mineByCourse: (courseId: string) => [...attemptKeys.all, "mine", "course", courseId] as const,
  mineAll: () => [...attemptKeys.all, "mine", "all"] as const,
  mineReview: (id: string) => [...attemptKeys.all, "mine", "review", id] as const,
  detail: (id: string) => [...attemptKeys.all, "detail", id] as const,
  inbox: (filter: "pending" | "all" | "graded") =>
    [...attemptKeys.all, "inbox", filter] as const,
  pendingCount: () => [...attemptKeys.all, "pending-count"] as const,
  quizResults: (quizId: string) => [...attemptKeys.all, "quiz-results", quizId] as const,
};

export const profileKeys = {
  all: ["profiles"] as const,
  me: () => [...profileKeys.all, "me"] as const,
};

export const completionKeys = {
  all: ["lesson_completions"] as const,
  mineByCourse: (courseId: string) => [...completionKeys.all, "mine", "course", courseId] as const,
  byCourse: (courseId: string) => [...completionKeys.all, "course", courseId] as const,
};

export const engagementKeys = {
  all: ["engagement"] as const,
  recentActivity: () => [...engagementKeys.all, "recent-activity"] as const,
};

export const attendanceKeys = {
  all: ["session_attendance"] as const,
  bySession: (sessionId: string) => [...attendanceKeys.all, "session", sessionId] as const,
  byCourse: (courseId: string) => [...attendanceKeys.all, "course", courseId] as const,
  unmarked: () => [...attendanceKeys.all, "unmarked"] as const,
  unmarkedCount: () => [...attendanceKeys.all, "unmarked-count"] as const,
};

export const questionKeys = {
  all: ["course_questions"] as const,
  byCourse: (courseId: string) => [...questionKeys.all, "course", courseId] as const,
  detail: (id: string) => [...questionKeys.all, "detail", id] as const,
};

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  recentInvites: () => [...adminKeys.all, "recent-invites"] as const,
  instructors: () => [...adminKeys.all, "instructors"] as const,
  students: () => [...adminKeys.all, "students"] as const,
  instructorUsage: (id: string) =>
    [...adminKeys.all, "instructor-usage", id] as const,
};

export const aiAdminKeys = {
  all: ["ai-admin"] as const,
  generations: (filters: {
    feature?: string;
    model?: string;
    onlyUnrated?: boolean;
    onlyErrors?: boolean;
  }) => [...aiAdminKeys.all, "generations", filters] as const,
  generation: (id: string) => [...aiAdminKeys.all, "generation", id] as const,
  evaluation: (generationId: string) =>
    [...aiAdminKeys.all, "evaluation", generationId] as const,
  agreement: (rubricKey: string) =>
    [...aiAdminKeys.all, "agreement", rubricKey] as const,
};

export const aiUsageKeys = {
  all: ["ai-usage"] as const,
  mine: () => [...aiUsageKeys.all, "mine"] as const,
};

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};
