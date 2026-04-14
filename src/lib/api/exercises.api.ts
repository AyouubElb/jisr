import { createClient } from "@/lib/supabase/client";
import type { Exercise, ExerciseInsert, ExerciseUpdate } from "@/lib/types";

export const exercisesApi = {
  /** List exercises for a section */
  listBySection: async (sectionId: string): Promise<Exercise[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("section_id", sectionId)
      .order("order", { ascending: true });

    if (error) throw error;
    return data;
  },

  /** Create a new exercise */
  create: async (exercise: ExerciseInsert): Promise<Exercise> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .insert(exercise)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update an exercise */
  update: async (id: string, updates: ExerciseUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("exercises")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete an exercise */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) throw error;
  },
};
