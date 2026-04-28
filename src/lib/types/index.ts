import type { Database } from "./database";

// Row types (what you get back from SELECT)
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Section = Database["public"]["Tables"]["sections"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LiveSession = Database["public"]["Tables"]["live_sessions"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
export type QuizBlock = Database["public"]["Tables"]["quiz_blocks"]["Row"];
export type StudentAttempt = Database["public"]["Tables"]["student_attempts"]["Row"];
export type StudentAnswer = Database["public"]["Tables"]["student_answers"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type LessonCompletion = Database["public"]["Tables"]["lesson_completions"]["Row"];
export type SessionAttendance = Database["public"]["Tables"]["session_attendance"]["Row"];
export type CourseQuestion = Database["public"]["Tables"]["course_questions"]["Row"];
export type CourseQuestionReply = Database["public"]["Tables"]["course_question_replies"]["Row"];
export type AIGeneration = Database["public"]["Tables"]["ai_generations"]["Row"];
export type SectionItem = Database["public"]["Tables"]["section_items"]["Row"];

// Insert types (what you send to INSERT)
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type SectionInsert = Database["public"]["Tables"]["sections"]["Insert"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type LiveSessionInsert = Database["public"]["Tables"]["live_sessions"]["Insert"];
export type QuizInsert = Database["public"]["Tables"]["quizzes"]["Insert"];
export type QuizBlockInsert = Database["public"]["Tables"]["quiz_blocks"]["Insert"];
export type StudentAttemptInsert = Database["public"]["Tables"]["student_attempts"]["Insert"];
export type StudentAnswerInsert = Database["public"]["Tables"]["student_answers"]["Insert"];
export type MaterialInsert = Database["public"]["Tables"]["materials"]["Insert"];
export type CourseQuestionInsert = Database["public"]["Tables"]["course_questions"]["Insert"];
export type CourseQuestionReplyInsert = Database["public"]["Tables"]["course_question_replies"]["Insert"];
export type AIGenerationInsert = Database["public"]["Tables"]["ai_generations"]["Insert"];

// Update types (what you send to UPDATE)
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
export type SectionUpdate = Database["public"]["Tables"]["sections"]["Update"];
export type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"];
export type QuizUpdate = Database["public"]["Tables"]["quizzes"]["Update"];
export type QuizBlockUpdate = Database["public"]["Tables"]["quiz_blocks"]["Update"];
export type StudentAttemptUpdate = Database["public"]["Tables"]["student_attempts"]["Update"];
export type StudentAnswerUpdate = Database["public"]["Tables"]["student_answers"]["Update"];
export type LiveSessionUpdate = Database["public"]["Tables"]["live_sessions"]["Update"];
export type CourseQuestionUpdate = Database["public"]["Tables"]["course_questions"]["Update"];
export type AIGenerationUpdate = Database["public"]["Tables"]["ai_generations"]["Update"];

// Derived types
export type UserRole = Profile["role"];
export type CEFRLevel = Course["level"];
export type LessonType = Lesson["type"];
export type QuizBlockType = QuizBlock["type"];
export type AttemptStatus = StudentAttempt["status"];
export type QuestionStatus = CourseQuestion["status"];

// Question with joined student profile + replies (each reply with author profile)
export interface CourseQuestionWithDetails extends CourseQuestion {
  student: Pick<Profile, "id" | "full_name" | "avatar_url">;
  reply_count: number;
}

export interface CourseQuestionReplyWithAuthor extends CourseQuestionReply {
  author: Pick<Profile, "id" | "full_name" | "avatar_url" | "role">;
}

export interface CourseQuestionThread extends CourseQuestion {
  student: Pick<Profile, "id" | "full_name" | "avatar_url">;
  replies: CourseQuestionReplyWithAuthor[];
}

// Quiz with nested blocks
export interface QuizWithBlocks extends Quiz {
  quiz_blocks: QuizBlock[];
}

// One entry in a section's shared ordered timeline.
// `data` carries the underlying lesson or quiz row inline so consumers don't
// need to re-join client-side. Discriminated by `item_type`.
export type SectionTimelineItem =
  | { id: string; item_type: "lesson"; position: number; data: Lesson }
  | { id: string; item_type: "quiz"; position: number; data: QuizWithBlocks };

// Section with nested lessons and quizzes.
// `lessons[]` and `quizzes[]` are kept for backward compatibility with
// existing consumers; `items[]` is the new source of truth for ordering
// (lessons + quizzes interleaved, sorted by position ascending).
export interface SectionWithContent extends Section {
  lessons: Lesson[];
  quizzes: QuizWithBlocks[];
  items: SectionTimelineItem[];
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
