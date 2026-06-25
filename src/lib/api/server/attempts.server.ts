import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { QuizBlock } from "@/lib/types";
import { isManualBlock, type BlockType } from "@/lib/schemas/quiz.schema";

/**
 * Server twin of attemptsApi.pendingGradingCount. Mirrors the "pending" filter
 * of listGradingInbox: count submitted attempts that still have at least one
 * ungraded manual answer.
 */
export async function pendingGradingCountServer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("student_attempts")
    .select(
      `
      id,
      quiz:quizzes!inner(
        quiz_blocks(id, type, "order"),
        section:sections!inner(course:courses!inner(instructor_id))
      ),
      student_answers(block_id, graded_at)
      `,
    )
    .eq("quiz.section.course.instructor_id", userId)
    .not("submitted_at", "is", null);

  if (error) throw error;

  type Row = {
    quiz: { quiz_blocks: Pick<QuizBlock, "id" | "type">[] };
    student_answers: { block_id: string; graded_at: string | null }[];
  };

  let pending = 0;
  for (const r of (data ?? []) as unknown as Row[]) {
    const manualBlockIds = new Set(
      r.quiz.quiz_blocks
        .filter((b) => isManualBlock(b.type as BlockType))
        .map((b) => b.id),
    );
    if (manualBlockIds.size === 0) continue;

    const hasPending = r.student_answers.some(
      (a) => manualBlockIds.has(a.block_id) && a.graded_at === null,
    );
    if (hasPending) pending += 1;
  }

  return pending;
}
