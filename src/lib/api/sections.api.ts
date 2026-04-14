import { createClient } from "@/lib/supabase/client";
import type { Section, SectionInsert, SectionUpdate, SectionWithContent } from "@/lib/types";

export const sectionsApi = {
  /** List sections for a course with their lessons and exercises */
  listByCourse: async (courseId: string): Promise<SectionWithContent[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sections")
      .select("*, lessons(*), exercises(*), quizzes(*, quiz_blocks(*))")
      .eq("course_id", courseId)
      .order("order", { ascending: true })
      .order("order", { referencedTable: "lessons", ascending: true })
      .order("order", { referencedTable: "exercises", ascending: true })
      .order("order", { referencedTable: "quizzes", ascending: true })
      .order("order", { referencedTable: "quizzes.quiz_blocks", ascending: true });

    if (error) throw error;
    return data as unknown as SectionWithContent[];
  },

  /** Create a new section */
  create: async (section: SectionInsert): Promise<Section> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sections")
      .insert(section)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a section */
  update: async (id: string, updates: SectionUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("sections")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a section (cascades to lessons + exercises + quizzes) */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) throw error;
  },
};
