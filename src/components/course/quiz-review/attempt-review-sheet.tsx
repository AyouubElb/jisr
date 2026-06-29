"use client";

import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewBlockCard } from "@/components/course/quiz-review/quiz-review-blocks";
import { useAttemptReview } from "@/lib/hooks/useAttempts";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import type { CEFRLevel } from "@/lib/types";

interface AttemptReviewSheetProps {
  attemptId: string | null;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttemptReviewSheet({
  attemptId,
  studentName,
  open,
  onOpenChange,
}: AttemptReviewSheetProps): React.JSX.Element {
  const { data: attempt, isLoading } = useAttemptReview(open ? attemptId : null);

  const answersByBlock = new Map(
    (attempt?.answers ?? []).map((a) => [a.block_id, a]),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto !max-w-full md:!max-w-md lg:!max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-lg">{studentName}</SheetTitle>
          {attempt && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge className={LEVEL_BADGE_COLORS[attempt.course_level as CEFRLevel]}>
                {attempt.course_level}
              </Badge>
              <span className="truncate">{attempt.course_title}</span>
              <span>&middot;</span>
              <span className="truncate">{attempt.quiz_title}</span>
            </div>
          )}
          {attempt && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {attempt.auto_score !== null && (
                <Badge variant="secondary">Auto {attempt.auto_score}%</Badge>
              )}
              {attempt.pending_count > 0 ? (
                <Badge variant="secondary">
                  {attempt.pending_count} / {attempt.manual_count} pending
                </Badge>
              ) : (
                attempt.final_score !== null && (
                  <Badge variant="outline">Final {attempt.final_score}%</Badge>
                )
              )}
              <span className="text-muted-foreground">
                Submitted{" "}
                {format(new Date(attempt.submitted_at), "MMM d, yyyy", { locale: enUS })}
              </span>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-3 px-4 py-4">
          {isLoading || !attempt ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : (
            attempt.blocks.map((block, index) => (
              <ReviewBlockCard
                key={block.id}
                block={block}
                index={index}
                answer={answersByBlock.get(block.id) ?? null}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
