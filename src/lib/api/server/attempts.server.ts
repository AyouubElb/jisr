import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Server twin of attemptsApi.pendingGradingCount. Counts the instructor's
 * attempts still awaiting manual grading via the status column — no blocks or
 * answers fetched.
 */
export async function pendingGradingCountServer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("student_attempts")
    .select(
      "id, quiz:quizzes!inner(section:sections!inner(course:courses!inner(instructor_id)))",
      { count: "exact", head: true },
    )
    .eq("quiz.section.course.instructor_id", userId)
    .eq("status", "pending_review");

  if (error) throw error;
  return count ?? 0;
}
