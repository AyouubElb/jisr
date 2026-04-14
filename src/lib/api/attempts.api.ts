import { createClient } from "@/lib/supabase/client";
import type { StudentAttempt, StudentAnswer, QuizBlock } from "@/lib/types";

export interface AttemptWithAnswers extends StudentAttempt {
  student_answers: StudentAnswer[];
}

export interface SubmittedAnswerInput {
  block_id: string;
  selected_option_id?: string | null;
  text_answer?: string | null;
}

/**
 * Auto-grading helper — runs client-side before insert so we save graded rows.
 * MCQ: check selected option against is_correct in block content.
 * Fill blank: compare normalized text_answer to accepted_answers.
 * Free text: no auto-grading, left null for instructor review.
 */
function gradeAnswer(
  block: QuizBlock,
  answer: SubmittedAnswerInput,
): { is_correct: boolean | null; points_awarded: number | null } {
  const content = block.content as Record<string, unknown>;

  if (block.type === "mcq") {
    const options = (content.options as { id: string; is_correct: boolean }[]) ?? [];
    const picked = options.find((o) => o.id === answer.selected_option_id);
    const correct = picked?.is_correct === true;
    return {
      is_correct: correct,
      points_awarded: correct ? (block.points ?? 0) : 0,
    };
  }

  if (block.type === "fill_blank") {
    const accepted = ((content.accepted_answers as string[]) ?? []).map((a) =>
      a.trim().toLowerCase(),
    );
    const given = (answer.text_answer ?? "").trim().toLowerCase();
    const correct = given.length > 0 && accepted.includes(given);
    return {
      is_correct: correct,
      points_awarded: correct ? (block.points ?? 0) : 0,
    };
  }

  // free_text: needs instructor review
  return { is_correct: null, points_awarded: null };
}

export const attemptsApi = {
  /** Current student's attempts for one quiz */
  listMineByQuiz: async (quizId: string): Promise<StudentAttempt[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("student_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("student_id", user.id)
      .order("started_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /** Single attempt with all answers */
  detail: async (attemptId: string): Promise<AttemptWithAnswers> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("student_attempts")
      .select("*, student_answers(*)")
      .eq("id", attemptId)
      .single();

    if (error) throw error;
    return data as unknown as AttemptWithAnswers;
  },

  /**
   * Submit a quiz in one shot: create attempt + insert graded answers + update total score.
   * Much simpler than the start-then-submit pattern — atomic from the student's perspective.
   */
  submit: async (
    quizId: string,
    blocks: QuizBlock[],
    answers: SubmittedAnswerInput[],
  ): Promise<StudentAttempt> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    // Grade each answer
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    const gradedAnswers = answers.map((a) => {
      const block = blockMap.get(a.block_id);
      if (!block) throw new Error(`Bloc introuvable: ${a.block_id}`);
      const { is_correct, points_awarded } = gradeAnswer(block, a);
      return {
        block_id: a.block_id,
        selected_option_id: a.selected_option_id ?? null,
        text_answer: a.text_answer ?? null,
        is_correct,
        points_awarded,
      };
    });

    // Compute scores
    const questionBlocks = blocks.filter(
      (b) => b.type === "mcq" || b.type === "fill_blank" || b.type === "free_text",
    );
    const maxScore = questionBlocks.reduce((sum, b) => sum + (b.points ?? 0), 0);
    const score = gradedAnswers
      .filter((a) => a.points_awarded !== null)
      .reduce((sum, a) => sum + (a.points_awarded ?? 0), 0);

    const hasUngraded = gradedAnswers.some((a) => a.is_correct === null);
    const status = hasUngraded ? "submitted" : "graded";

    // Insert attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("student_attempts")
      .insert({
        quiz_id: quizId,
        student_id: user.id,
        submitted_at: new Date().toISOString(),
        score,
        max_score: maxScore,
        status,
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Insert answers linked to attempt
    if (gradedAnswers.length > 0) {
      const { error: answersError } = await supabase
        .from("student_answers")
        .insert(gradedAnswers.map((a) => ({ ...a, attempt_id: attempt.id })));

      if (answersError) throw answersError;
    }

    return attempt;
  },
};
