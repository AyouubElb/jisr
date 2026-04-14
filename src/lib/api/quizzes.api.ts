import { createClient } from "@/lib/supabase/client";
import type {
  Quiz,
  QuizInsert,
  QuizUpdate,
  QuizBlock,
  QuizBlockInsert,
  QuizBlockUpdate,
  QuizWithBlocks,
} from "@/lib/types";

export const quizzesApi = {
  /** Get a quiz with its blocks */
  detail: async (id: string): Promise<QuizWithBlocks> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quizzes")
      .select("*, quiz_blocks(*)")
      .eq("id", id)
      .order("order", { referencedTable: "quiz_blocks", ascending: true })
      .single();

    if (error) throw error;
    return data as unknown as QuizWithBlocks;
  },

  /** Create a new quiz */
  create: async (quiz: QuizInsert): Promise<Quiz> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quizzes")
      .insert(quiz)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a quiz */
  update: async (id: string, updates: QuizUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("quizzes")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a quiz */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) throw error;
  },

  /** Save all blocks for a quiz (delete existing + bulk insert) */
  saveBlocks: async (
    quizId: string,
    blocks: Omit<QuizBlockInsert, "quiz_id">[],
  ): Promise<QuizBlock[]> => {
    const supabase = createClient();

    // Delete existing blocks
    const { error: deleteError } = await supabase
      .from("quiz_blocks")
      .delete()
      .eq("quiz_id", quizId);

    if (deleteError) throw deleteError;

    if (blocks.length === 0) return [];

    // Insert new blocks
    const { data, error } = await supabase
      .from("quiz_blocks")
      .insert(blocks.map((b) => ({ ...b, quiz_id: quizId })))
      .select();

    if (error) throw error;
    return data;
  },
};
