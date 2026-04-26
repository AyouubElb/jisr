import { createClient } from "@/lib/supabase/client";
import type {
  CourseQuestion,
  CourseQuestionInsert,
  CourseQuestionReply,
  CourseQuestionReplyInsert,
  CourseQuestionWithDetails,
  CourseQuestionThread,
  QuestionStatus,
} from "@/lib/types";

export const questionsApi = {
  /** List questions for a course (instructor sees all; student sees own via RLS) */
  listByCourse: async (
    courseId: string,
  ): Promise<CourseQuestionWithDetails[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_questions")
      .select(
        "*, student:profiles!course_questions_student_id_fkey(id, full_name, avatar_url), replies:course_question_replies(count)",
      )
      .eq("course_id", courseId)
      .order("last_activity_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => {
      const r = row as unknown as CourseQuestion & {
        student: { id: string; full_name: string; avatar_url: string | null };
        replies: { count: number }[];
      };
      return {
        ...r,
        student: r.student,
        reply_count: r.replies?.[0]?.count ?? 0,
      };
    });
  },

  /** Single thread with all replies, ordered oldest-first */
  getThread: async (questionId: string): Promise<CourseQuestionThread> => {
    const supabase = createClient();

    const { data: question, error: qErr } = await supabase
      .from("course_questions")
      .select(
        "*, student:profiles!course_questions_student_id_fkey(id, full_name, avatar_url)",
      )
      .eq("id", questionId)
      .single();
    if (qErr) throw qErr;

    const { data: replies, error: rErr } = await supabase
      .from("course_question_replies")
      .select(
        "*, author:profiles!course_question_replies_author_id_fkey(id, full_name, avatar_url, role)",
      )
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });
    if (rErr) throw rErr;

    return {
      ...(question as unknown as CourseQuestion & {
        student: { id: string; full_name: string; avatar_url: string | null };
      }),
      replies: (replies ?? []) as unknown as CourseQuestionThread["replies"],
    };
  },

  /** Student posts a new question */
  create: async (input: CourseQuestionInsert): Promise<CourseQuestion> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_questions")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Add a reply (student or instructor) */
  reply: async (
    input: CourseQuestionReplyInsert,
  ): Promise<CourseQuestionReply> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_question_replies")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Toggle resolved/open */
  setStatus: async (
    questionId: string,
    status: QuestionStatus,
  ): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("course_questions")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", questionId);

    if (error) throw error;
  },

  /** Delete a thread (asker or instructor) */
  delete: async (questionId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("course_questions")
      .delete()
      .eq("id", questionId);
    if (error) throw error;
  },
};
