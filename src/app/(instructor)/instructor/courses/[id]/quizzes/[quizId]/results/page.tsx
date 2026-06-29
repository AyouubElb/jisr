import { requireInstructor } from "@/lib/supabase/guards";
import { QuizResultsContent } from "@/components/course/quiz-review/quiz-results-content";

export default async function QuizResultsPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}): Promise<React.JSX.Element> {
  await requireInstructor();
  const { id, quizId } = await params;

  return <QuizResultsContent courseId={id} quizId={quizId} />;
}
