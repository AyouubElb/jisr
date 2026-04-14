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
  detail: (id: string) => [...lessonKeys.all, "detail", id] as const,
};

export const exerciseKeys = {
  all: ["exercises"] as const,
  bySection: (sectionId: string) => [...exerciseKeys.all, "section", sectionId] as const,
  detail: (id: string) => [...exerciseKeys.all, "detail", id] as const,
};

export const materialKeys = {
  all: ["materials"] as const,
  byLesson: (lessonId: string) => [...materialKeys.all, "lesson", lessonId] as const,
  byExercise: (exerciseId: string) => [...materialKeys.all, "exercise", exerciseId] as const,
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
  detail: (id: string) => [...attemptKeys.all, "detail", id] as const,
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

export const attendanceKeys = {
  all: ["session_attendance"] as const,
  bySession: (sessionId: string) => [...attendanceKeys.all, "session", sessionId] as const,
  byCourse: (courseId: string) => [...attendanceKeys.all, "course", courseId] as const,
};
