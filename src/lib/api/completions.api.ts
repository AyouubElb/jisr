import { createClient } from "@/lib/supabase/client";
import type { LessonCompletion } from "@/lib/types";

export const completionsApi = {
  /** Current student's lesson completions across all lessons in one course */
  listMineByCourse: async (courseId: string): Promise<LessonCompletion[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("lesson_completions")
      .select("*, lessons!inner(section_id, sections!inner(course_id))")
      .eq("student_id", user.id)
      .eq("lessons.sections.course_id", courseId);

    if (error) throw error;
    return data as unknown as LessonCompletion[];
  },

  /** All completions for all enrolled students in a course (instructor view) */
  listByCourse: async (courseId: string): Promise<LessonCompletion[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lesson_completions")
      .select("*, lessons!inner(section_id, sections!inner(course_id))")
      .eq("lessons.sections.course_id", courseId);

    if (error) throw error;
    return data as unknown as LessonCompletion[];
  },

  /** Mark a lesson complete for current student */
  markComplete: async (lessonId: string): Promise<LessonCompletion> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("lesson_completions")
      .insert({ lesson_id: lessonId, student_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Un-mark — student can toggle off */
  unmarkComplete: async (lessonId: string): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { error } = await supabase
      .from("lesson_completions")
      .delete()
      .eq("lesson_id", lessonId)
      .eq("student_id", user.id);

    if (error) throw error;
  },

  /** Bump enrollment.last_active_at for current student in a course */
  touchActivity: async (courseId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.rpc("touch_enrollment_activity", {
      p_course_id: courseId,
    });
    if (error) throw error;
  },
};
