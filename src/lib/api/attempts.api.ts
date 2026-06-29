import { createClient } from "@/lib/supabase/client";
import type {
  StudentAttempt,
  StudentAnswer,
  QuizBlock,
  CEFRLevel,
} from "@/lib/types";
import {
  isGradableBlock,
  isManualBlock,
  type BlockType,
} from "@/lib/schemas/quiz.schema";

export interface AttemptWithAnswers extends StudentAttempt {
  student_answers: StudentAnswer[];
}

// gradeAttempt finalizes only when every manual block is graded. On finalize it
// returns the data the notify step needs; otherwise just { finalized: false }.
export type GradeAttemptResult =
  | { finalized: false }
  | {
      finalized: true;
      attempt_id: string;
      student_id: string;
      quiz_id: string;
      quiz_title: string;
      course_id: string;
      score: number | null;
    };

/**
 * One row per submitted attempt that contains at least one manual block.
 * Carries the full quiz shape (all blocks, all answers) so the grading pane
 * can render the whole quiz in context — not just the answers awaiting review.
 */
export interface GradingAttempt {
  attempt_id: string;
  status: StudentAttempt["status"];
  submitted_at: string;
  auto_score: number | null;
  final_score: number | null;
  graded_at: string | null;
  student_id: string;
  student_name: string;
  quiz_id: string;
  quiz_title: string;
  course_id: string;
  course_title: string;
  course_level: CEFRLevel;
  blocks: QuizBlock[];
  answers: GradingAnswer[];
  manual_count: number;
  pending_count: number;
}

export interface AIErrorEntry {
  span: string;
  kind: "grammar" | "vocab" | "spelling" | "l1_calque" | "register" | "off_topic";
  fix: string;
}

export interface AIPronunciationError {
  word: string;
  issue: string;
}

export interface AIGradePayload {
  items: AIErrorEntry[];
  instructor_note: string | null;
  pronunciation_errors?: AIPronunciationError[];
  fluency_note?: string | null;
}

export interface GradingAnswer {
  id: string;
  block_id: string;
  answer: Record<string, unknown>;
  is_correct: boolean | null;
  earned_weight: number | null;
  instructor_feedback: string | null;
  graded_at: string | null;
  ai_score: number | null;
  ai_is_correct: boolean | null;
  ai_rationale: string | null;
  ai_errors: AIGradePayload | null;
  ai_graded_at: string | null;
}

/**
 * Summary row for the student "mes notes" page — one per submitted attempt,
 * with quiz + course joined and manual-grading counts computed so the list
 * can show "en attente de correction" / "corrige" without extra queries.
 */
export interface MyAttemptSummary {
  attempt_id: string;
  status: StudentAttempt["status"];
  submitted_at: string;
  auto_score: number | null;
  final_score: number | null;
  graded_at: string | null;
  quiz_id: string;
  quiz_title: string;
  course_id: string;
  course_title: string;
  course_level: CEFRLevel;
  manual_count: number;
  pending_count: number;
}

/** Full detail for the student review page — carries every block + answer */
export interface MyAttemptReview extends MyAttemptSummary {
  blocks: QuizBlock[];
  answers: GradingAnswer[];
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
   * Start a new attempt via the start_quiz_attempt RPC. The RPC runs with
   * SECURITY DEFINER and atomically: verifies enrollment, checks
   * quizzes.max_attempts (all statuses count, including in_progress), then
   * inserts the in_progress row. Bypassing the cap with a direct table
   * INSERT is impossible — that path would skip the check.
   */
  start: async (quizId: string): Promise<StudentAttempt> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("start_quiz_attempt", { p_quiz_id: quizId })
      .single();
    if (error) throw error;
    return data as StudentAttempt;
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

  // ── Instructor grading inbox ───────────────────────────────────────

  /**
   * Grading feed — one row per submitted attempt that has at least one
   * manual block. Each row carries the full quiz (blocks + answers) so the
   * grading pane can show the whole quiz in context. Filter modes:
   *   - "pending" — attempts with >=1 ungraded manual answer
   *   - "graded"  — attempts where every manual answer is graded
   *   - "all"     — both
   */
  listGradingInbox: async (
    filter: "pending" | "all" | "graded",
  ): Promise<GradingAttempt[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("student_attempts")
      .select(
        `
        id, status, submitted_at, auto_score, final_score, graded_at,
        student:profiles!student_attempts_student_id_fkey(id, full_name),
        quiz:quizzes!inner(
          id, title,
          quiz_blocks(*),
          section:sections!inner(
            course:courses!inner(id, title, level, instructor_id)
          )
        ),
        student_answers(
          id, block_id, answer, is_correct, earned_weight,
          instructor_feedback, graded_at,
          ai_score, ai_is_correct, ai_rationale, ai_errors, ai_graded_at
        )
        `,
      )
      .eq("quiz.section.course.instructor_id", user.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: true });

    if (error) throw error;

    type Row = {
      id: string;
      status: StudentAttempt["status"];
      submitted_at: string;
      auto_score: number | null;
      final_score: number | null;
      graded_at: string | null;
      student: { id: string; full_name: string };
      quiz: {
        id: string;
        title: string;
        quiz_blocks: QuizBlock[];
        section: {
          course: { id: string; title: string; level: CEFRLevel };
        };
      };
      student_answers: GradingAnswer[];
    };

    const out: GradingAttempt[] = [];
    for (const r of (data ?? []) as unknown as Row[]) {
      const blocks = [...r.quiz.quiz_blocks].sort((a, b) => a.order - b.order);
      const manualBlockIds = new Set(
        blocks.filter((b) => isManualBlock(b.type as BlockType)).map((b) => b.id),
      );
      if (manualBlockIds.size === 0) continue; // No manual grading needed, skip

      const manualAnswers = r.student_answers.filter((a) =>
        manualBlockIds.has(a.block_id),
      );
      const pendingCount = manualAnswers.filter((a) => a.graded_at === null).length;

      if (filter === "pending" && pendingCount === 0) continue;
      if (filter === "graded" && pendingCount > 0) continue;

      out.push({
        attempt_id: r.id,
        status: r.status,
        submitted_at: r.submitted_at,
        auto_score: r.auto_score,
        final_score: r.final_score,
        graded_at: r.graded_at,
        student_id: r.student.id,
        student_name: r.student.full_name,
        quiz_id: r.quiz.id,
        quiz_title: r.quiz.title,
        course_id: r.quiz.section.course.id,
        course_title: r.quiz.section.course.title,
        course_level: r.quiz.section.course.level,
        blocks,
        answers: r.student_answers,
        manual_count: manualBlockIds.size,
        pending_count: pendingCount,
      });
    }

    return out;
  },

  /** Sidebar badge — count of the instructor's attempts still awaiting manual grading */
  pendingGradingCount: async (): Promise<number> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { count, error } = await supabase
      .from("student_attempts")
      .select(
        "id, quiz:quizzes!inner(section:sections!inner(course:courses!inner(instructor_id)))",
        { count: "exact", head: true },
      )
      .eq("quiz.section.course.instructor_id", user.id)
      .eq("status", "pending_review");

    if (error) throw error;
    return count ?? 0;
  },

  /**
   * Batch-grade every manual answer on an attempt in one shot. After the
   * updates, if every manual answer now has a grade we recompute final_score
   * from all graded answers and flip the attempt to "graded".
   */
  gradeAttempt: async (input: {
    attempt_id: string;
    grades: {
      answer_id: string;
      block_weight: number;
      earned_weight: number;
      feedback: string | null;
    }[];
  }): Promise<GradeAttemptResult> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const now = new Date().toISOString();

    // Update each answer. Supabase has no bulk UPDATE-by-id, so we fan out;
    // the grades array is capped by the number of manual blocks in a quiz.
    await Promise.all(
      input.grades.map((g) =>
        supabase
          .from("student_answers")
          .update({
            earned_weight: g.earned_weight,
            is_correct: g.earned_weight >= g.block_weight,
            instructor_feedback: g.feedback,
            graded_at: now,
          })
          .eq("id", g.answer_id)
          .then(({ error }) => {
            if (error) throw error;
          }),
      ),
    );

    // Refetch attempt to see if we can finalize. Also pull student + quiz +
    // course so a finalize can hand the notification step what it needs.
    const { data: attempt, error: fetchError } = await supabase
      .from("student_attempts")
      .select(
        `
        id,
        student_id,
        quiz:quizzes!inner(id, title, quiz_blocks(id, type, weight), section:sections!inner(course_id)),
        student_answers(block_id, earned_weight, graded_at)
        `,
      )
      .eq("id", input.attempt_id)
      .single();

    if (fetchError) throw fetchError;

    type AttemptShape = {
      id: string;
      student_id: string;
      quiz: {
        id: string;
        title: string;
        quiz_blocks: { id: string; type: BlockType; weight: number | null }[];
        section: { course_id: string };
      };
      student_answers: {
        block_id: string;
        earned_weight: number | null;
        graded_at: string | null;
      }[];
    };

    const att = attempt as unknown as AttemptShape;
    const gradableBlocks = att.quiz.quiz_blocks.filter((b) => isGradableBlock(b.type));
    const manualBlocks = gradableBlocks.filter((b) => isManualBlock(b.type));

    const allManualGraded = manualBlocks.every((b) => {
      const a = att.student_answers.find((x) => x.block_id === b.id);
      return a && a.graded_at !== null;
    });

    if (!allManualGraded) return { finalized: false };

    const totalWeight = gradableBlocks.reduce(
      (sum, b) => sum + Number(b.weight ?? 0),
      0,
    );
    const earnedTotal = att.student_answers.reduce(
      (sum, a) => sum + Number(a.earned_weight ?? 0),
      0,
    );
    const finalScore =
      totalWeight > 0 ? Math.round((earnedTotal / totalWeight) * 100) : null;

    const { error: updateError } = await supabase
      .from("student_attempts")
      .update({
        final_score: finalScore,
        status: "graded",
        graded_at: now,
        graded_by: user.id,
      })
      .eq("id", input.attempt_id);

    if (updateError) throw updateError;

    // Finalized — return what the notify step needs (student is the recipient).
    return {
      finalized: true,
      attempt_id: att.id,
      student_id: att.student_id,
      quiz_id: att.quiz.id,
      quiz_title: att.quiz.title,
      course_id: att.quiz.section.course_id,
      score: finalScore,
    };
  },

  // ── Student "mes notes" history ────────────────────────────────────

  /**
   * Every submitted attempt of the current student, across every course,
   * with the counts needed to split the list into pending / graded sections.
   */
  listMine: async (): Promise<MyAttemptSummary[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("student_attempts")
      .select(
        `
        id, status, submitted_at, auto_score, final_score, graded_at,
        quiz:quizzes!inner(
          id, title,
          quiz_blocks(id, type),
          section:sections!inner(
            course:courses!inner(id, title, level)
          )
        ),
        student_answers(block_id, graded_at)
        `,
      )
      .eq("student_id", user.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    type Row = {
      id: string;
      status: StudentAttempt["status"];
      submitted_at: string;
      auto_score: number | null;
      final_score: number | null;
      graded_at: string | null;
      quiz: {
        id: string;
        title: string;
        quiz_blocks: { id: string; type: BlockType }[];
        section: {
          course: { id: string; title: string; level: CEFRLevel };
        };
      };
      student_answers: { block_id: string; graded_at: string | null }[];
    };

    return (data as unknown as Row[]).map((r) => {
      const manualBlockIds = new Set(
        r.quiz.quiz_blocks
          .filter((b) => isManualBlock(b.type))
          .map((b) => b.id),
      );
      const manualAnswers = r.student_answers.filter((a) =>
        manualBlockIds.has(a.block_id),
      );
      const pendingCount = manualAnswers.filter((a) => a.graded_at === null).length;

      return {
        attempt_id: r.id,
        status: r.status,
        submitted_at: r.submitted_at,
        auto_score: r.auto_score,
        final_score: r.final_score,
        graded_at: r.graded_at,
        quiz_id: r.quiz.id,
        quiz_title: r.quiz.title,
        course_id: r.quiz.section.course.id,
        course_title: r.quiz.section.course.title,
        course_level: r.quiz.section.course.level,
        manual_count: manualBlockIds.size,
        pending_count: pendingCount,
      };
    });
  },

  /**
   * Single attempt with the full quiz (blocks + student's answers) for the
   * review page. RLS restricts to the owning student.
   */
  mineReview: async (attemptId: string): Promise<MyAttemptReview> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("student_attempts")
      .select(
        `
        id, status, submitted_at, auto_score, final_score, graded_at,
        quiz:quizzes!inner(
          id, title,
          quiz_blocks(*),
          section:sections!inner(
            course:courses!inner(id, title, level)
          )
        ),
        student_answers(
          id, block_id, answer, is_correct, earned_weight,
          instructor_feedback, graded_at,
          ai_score, ai_is_correct, ai_rationale, ai_errors, ai_graded_at
        )
        `,
      )
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (error) throw error;

    type Row = {
      id: string;
      status: StudentAttempt["status"];
      submitted_at: string;
      auto_score: number | null;
      final_score: number | null;
      graded_at: string | null;
      quiz: {
        id: string;
        title: string;
        quiz_blocks: QuizBlock[];
        section: {
          course: { id: string; title: string; level: CEFRLevel };
        };
      };
      student_answers: GradingAnswer[];
    };

    const r = data as unknown as Row;
    const blocks = [...r.quiz.quiz_blocks].sort((a, b) => a.order - b.order);
    const manualBlockIds = new Set(
      blocks
        .filter((b) => isManualBlock(b.type as BlockType))
        .map((b) => b.id),
    );
    const manualAnswers = r.student_answers.filter((a) =>
      manualBlockIds.has(a.block_id),
    );
    const pendingCount = manualAnswers.filter((a) => a.graded_at === null).length;

    return {
      attempt_id: r.id,
      status: r.status,
      submitted_at: r.submitted_at,
      auto_score: r.auto_score,
      final_score: r.final_score,
      graded_at: r.graded_at,
      quiz_id: r.quiz.id,
      quiz_title: r.quiz.title,
      course_id: r.quiz.section.course.id,
      course_title: r.quiz.section.course.title,
      course_level: r.quiz.section.course.level,
      manual_count: manualBlockIds.size,
      pending_count: pendingCount,
      blocks,
      answers: r.student_answers,
    };
  },
};
