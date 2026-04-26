import { createClient } from "@/lib/supabase/client";
import type { CEFRLevel, CourseInsert, CourseUpdate, CourseWithDetails, CourseWithInstructor } from "@/lib/types";

export const coursesApi = {
  /** List published courses (optionally filtered by level) */
  list: async (level?: CEFRLevel): Promise<CourseWithInstructor[]> => {
    const supabase = createClient();
    let query = supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (level) {
      query = query.eq("level", level);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as CourseWithInstructor[];
  },

  /** List all courses for the current instructor (published + drafts) */
  listMine: async (): Promise<CourseWithInstructor[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url)")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as CourseWithInstructor[];
  },

  /** Get a single course with sections (containing lessons + quizzes) and sessions */
  detail: async (id: string): Promise<CourseWithDetails> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url), sections(*, lessons(*), quizzes(*, quiz_blocks(*))), live_sessions(*)")
      .eq("id", id)
      .order("order", { referencedTable: "sections", ascending: true })
      .order("order", { referencedTable: "sections.lessons", ascending: true })
      .order("order", { referencedTable: "sections.quizzes", ascending: true })
      .order("order", { referencedTable: "sections.quizzes.quiz_blocks", ascending: true })
      .order("scheduled_at", { referencedTable: "live_sessions", ascending: true })
      .single();

    if (error) throw error;
    return data as unknown as CourseWithDetails;
  },

  /** Create a new course */
  create: async (course: CourseInsert): Promise<{ id: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .insert(course)
      .select("id")
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a course */
  update: async (id: string, updates: CourseUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a course */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) throw error;
  },
};
