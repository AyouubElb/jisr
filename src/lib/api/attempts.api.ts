import { createClient } from "@/lib/supabase/client";
import type { StudentAttempt, StudentAnswer, QuizBlock } from "@/lib/types";
import { isGradableBlock, isManualBlock } from "@/lib/schemas/quiz.schema";

export interface AttemptWithAnswers extends StudentAttempt {
  student_answers: StudentAnswer[];
}

/**
 * Student's response to a single block, before server-side grading.
 * Shape depends on block type:
 *   - mcq single:    { selected: "option_id" }
 *   - mcq multiple:  { selected: ["id1", "id2"] }
 *   - fill_blank:    { selected: "option_id" }
 *   - free_text:     { text: "My weekend was..." }
 *   - voice:         { audio_url: "path/in/storage", duration_seconds: 87 }
 */
export interface SubmittedAnswerInput {
  block_id: string;
  answer: Record<string, unknown>;
}

interface GradingResult {
  is_correct: boolean | null;
  earned_weight: number | null;
}

/**
 * Auto-grading — runs client-side before insert so we save graded rows.
 * Manual types (free_text, voice) return null and wait for instructor review.
 */
function gradeAnswer(block: QuizBlock, answer: Record<string, unknown>): GradingResult {
  const weight = Number(block.weight ?? 0);
  const content = block.content as Record<string, unknown>;

  if (block.type === "mcq") {
    const options =
      (content.options as { id: string; is_correct: boolean }[] | undefined) ?? [];
    const allowMultiple = content.allow_multiple === true;
    const correctIds = new Set(options.filter((o) => o.is_correct).map((o) => o.id));

    let selected: string[];
    if (allowMultiple) {
      selected = Array.isArray(answer.selected) ? (answer.selected as string[]) : [];
    } else {
      selected = typeof answer.selected === "string" ? [answer.selected] : [];
    }

    // Exact set match — all correct picked, no incorrect picked
    const picked = new Set(selected);
    const isCorrect =
      picked.size === correctIds.size &&
      [...picked].every((id) => correctIds.has(id));

    return {
      is_correct: isCorrect,
      earned_weight: isCorrect ? weight : 0,
    };
  }

  if (block.type === "fill_blank") {
    // Same as single-correct MCQ — student picks one option by id
    const options =
      (content.options as { id: string; is_correct: boolean }[] | undefined) ?? [];
    const correctId = options.find((o) => o.is_correct)?.id;
    const selected = typeof answer.selected === "string" ? answer.selected : "";
    const isCorrect = !!correctId && selected === correctId;

    return {
      is_correct: isCorrect,
      earned_weight: isCorrect ? weight : 0,
    };
  }

  // free_text, voice — needs instructor review
  return { is_correct: null, earned_weight: null };
}

/**
 * Compute overall attempt status + scores from graded answers.
 * final_score = (sum earned_weight / sum weight of ALL gradable blocks) * 100
 * auto_score  = same formula but only over auto-gradable blocks (instructor-facing)
 */
function computeScores(
  blocks: QuizBlock[],
  graded: { block_id: string; is_correct: boolean | null; earned_weight: number | null }[],
): {
  auto_score: number | null;
  final_score: number | null;
  status: "pending_review" | "graded";
} {
  const gradableBlocks = blocks.filter((b) => isGradableBlock(b.type));
  const hasManual = gradableBlocks.some((b) => isManualBlock(b.type));

  const totalWeight = gradableBlocks.reduce(
    (sum, b) => sum + Number(b.weight ?? 0),
    0,
  );
  const autoTotalWeight = gradableBlocks
    .filter((b) => !isManualBlock(b.type))
    .reduce((sum, b) => sum + Number(b.weight ?? 0), 0);

  const earnedAuto = graded
    .filter((a) => a.earned_weight !== null)
    .reduce((sum, a) => sum + Number(a.earned_weight ?? 0), 0);

  const auto_score =
    autoTotalWeight > 0 ? Math.round((earnedAuto / autoTotalWeight) * 100) : null;

  if (hasManual) {
    // Can't compute final_score yet — instructor must grade manual answers
    return { auto_score, final_score: null, status: "pending_review" };
  }

  const final_score =
    totalWeight > 0 ? Math.round((earnedAuto / totalWeight) * 100) : null;
  return { auto_score, final_score, status: "graded" };
}

export const attemptsApi = {
  /**
   * Start a new attempt — inserts an in_progress row with started_at set.
   * Returns the attempt so the client can key its timer off started_at.
   */
  start: async (quizId: string): Promise<StudentAttempt> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("student_attempts")
      .insert({
        quiz_id: quizId,
        student_id: user.id,
        started_at: new Date().toISOString(),
        status: "in_progress",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Current student's attempts for every quiz in a course. Used by the
   * lesson/quiz viewer sidebar to mark submitted quizzes with a check icon.
   */
  listMineByCourse: async (courseId: string): Promise<StudentAttempt[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("student_attempts")
      .select("*, quizzes!inner(section_id, sections!inner(course_id))")
      .eq("student_id", user.id)
      .eq("quizzes.sections.course_id", courseId);

    if (error) throw error;
    return data as unknown as StudentAttempt[];
  },

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
   * Submit an in-progress attempt: grade answers, update the existing attempt
   * row with scores + submitted_at, and insert answers. The attempt row must
   * already exist (created by start()).
   */
  submit: async (
    attemptId: string,
    blocks: QuizBlock[],
    answers: SubmittedAnswerInput[],
  ): Promise<StudentAttempt> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    // Grade each answer client-side (RLS re-checks ownership on insert)
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    const now = new Date().toISOString();
    const gradedAnswers = answers.map((a) => {
      const block = blockMap.get(a.block_id);
      if (!block) throw new Error(`Bloc introuvable: ${a.block_id}`);
      const { is_correct, earned_weight } = gradeAnswer(block, a.answer);
      return {
        block_id: a.block_id,
        answer: a.answer,
        is_correct,
        earned_weight,
        graded_at: earned_weight !== null ? now : null,
      };
    });

    const { auto_score, final_score, status } = computeScores(blocks, gradedAnswers);

    // Update the existing in-progress attempt row
    const { data: attempt, error: attemptError } = await supabase
      .from("student_attempts")
      .update({
        submitted_at: now,
        auto_score,
        final_score,
        status,
        graded_at: status === "graded" ? now : null,
      })
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Insert answers linked to attempt
    if (gradedAnswers.length > 0) {
      const { error: answersError } = await supabase
        .from("student_answers")
        .insert(gradedAnswers.map((a) => ({ ...a, attempt_id: attemptId })));

      if (answersError) throw answersError;
    }

    return attempt;
  },
};
