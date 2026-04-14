import type { Database } from "./database";

// Row types (what you get back from SELECT)
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Section = Database["public"]["Tables"]["sections"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type LiveSession = Database["public"]["Tables"]["live_sessions"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
export type QuizBlock = Database["public"]["Tables"]["quiz_blocks"]["Row"];
export type StudentAttempt = Database["public"]["Tables"]["student_attempts"]["Row"];
export type StudentAnswer = Database["public"]["Tables"]["student_answers"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type LessonCompletion = Database["public"]["Tables"]["lesson_completions"]["Row"];
export type SessionAttendance = Database["public"]["Tables"]["session_attendance"]["Row"];

// Insert types (what you send to INSERT)
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type SectionInsert = Database["public"]["Tables"]["sections"]["Insert"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type ExerciseInsert = Database["public"]["Tables"]["exercises"]["Insert"];
export type LiveSessionInsert = Database["public"]["Tables"]["live_sessions"]["Insert"];
export type QuizInsert = Database["public"]["Tables"]["quizzes"]["Insert"];
export type QuizBlockInsert = Database["public"]["Tables"]["quiz_blocks"]["Insert"];
export type StudentAttemptInsert = Database["public"]["Tables"]["student_attempts"]["Insert"];
export type StudentAnswerInsert = Database["public"]["Tables"]["student_answers"]["Insert"];
export type MaterialInsert = Database["public"]["Tables"]["materials"]["Insert"];

// Update types (what you send to UPDATE)
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
export type SectionUpdate = Database["public"]["Tables"]["sections"]["Update"];
export type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"];
export type ExerciseUpdate = Database["public"]["Tables"]["exercises"]["Update"];
export type QuizUpdate = Database["public"]["Tables"]["quizzes"]["Update"];
export type QuizBlockUpdate = Database["public"]["Tables"]["quiz_blocks"]["Update"];
export type StudentAttemptUpdate = Database["public"]["Tables"]["student_attempts"]["Update"];
export type StudentAnswerUpdate = Database["public"]["Tables"]["student_answers"]["Update"];
export type LiveSessionUpdate = Database["public"]["Tables"]["live_sessions"]["Update"];

// Derived types
export type UserRole = Profile["role"];
export type CEFRLevel = Course["level"];
export type LessonType = Lesson["type"];
export type QuizBlockType = QuizBlock["type"];
export type AttemptStatus = StudentAttempt["status"];

// Quiz with nested blocks
export interface QuizWithBlocks extends Quiz {
  quiz_blocks: QuizBlock[];
}

// Section with nested lessons, exercises, and quizzes
export interface SectionWithContent extends Section {
  lessons: Lesson[];
  exercises: Exercise[];
  quizzes: QuizWithBlocks[];
}

// Course with joined relations
export interface CourseWithInstructor extends Course {
  profiles: Pick<Profile, "full_name" | "avatar_url">;
}

export interface CourseWithDetails extends Course {
  profiles: Pick<Profile, "full_name" | "avatar_url">;
  sections: SectionWithContent[];
  live_sessions: LiveSession[];
}
