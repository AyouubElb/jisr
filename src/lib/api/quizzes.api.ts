import { createClient } from "@/lib/supabase/client";
import type {
  Quiz,
  QuizInsert,
  QuizUpdate,
  QuizBlock,
  QuizBlockInsert,
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

  /** Atomic save via save_quiz_blocks RPC. One round-trip, transactional, owner-checked. */
  saveBlocks: async (
    quizId: string,
    blocks: Omit<QuizBlockInsert, "quiz_id">[],
  ): Promise<QuizBlock[]> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_quiz_blocks", {
      p_quiz_id: quizId,
      p_blocks: blocks,
    });
    if (error) throw error;
    return (data ?? []) as QuizBlock[];
  },
};
