import { createClient } from "@/lib/supabase/client";
import type { Lesson, LessonInsert, LessonUpdate } from "@/lib/types";

export const lessonsApi = {
  /** List lessons for a section */
  listBySection: async (sectionId: string): Promise<Lesson[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("section_id", sectionId)
      .order("order", { ascending: true });

    if (error) throw error;
    return data;
  },

  /** Get a single lesson */
  detail: async (id: string): Promise<Lesson> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  /** Create a new lesson */
  create: async (lesson: LessonInsert): Promise<Lesson> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lessons")
      .insert(lesson)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a lesson */
  update: async (id: string, updates: LessonUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a lesson */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) throw error;
  },
};
