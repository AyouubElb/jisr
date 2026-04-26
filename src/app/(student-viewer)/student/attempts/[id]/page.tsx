"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ViewerShell } from "@/components/layout/viewer-shell";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { useMyAttemptReview } from "@/lib/hooks/useAttempts";
import { isManualBlock, type BlockType } from "@/lib/schemas/quiz.schema";
import type { GradingAnswer, MyAttemptReview } from "@/lib/api/attempts.api";
import type { QuizBlock } from "@/lib/types";
import {
  AudioBlockView,
  FillBlankReviewView,
  FreeTextAnswerView,
  FreeTextPromptView,
  ImageBlockView,
  InstructorFeedbackView,
  McqReviewView,
  QuestionHeader,
  TextBlockView,
  VoiceAnswerView,
  VoicePromptView,
} from "@/components/course/quiz-review/quiz-review-blocks";

export default function MyAttemptReviewPage(): React.JSX.Element {
  const params = useParams();
  const attemptId = params.id as string;
  const { data: attempt, isLoading } = useMyAttemptReview(attemptId);

  if (isLoading || !attempt) {
    return (
      <ViewerShell
        courseTitle=""
        exitHref="/student/attempts"
        loading
        sidebar={<SidebarSkeleton />}
      >
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ViewerShell>
    );
  }

  return <ReviewContent attempt={attempt} />;
}

function ReviewContent({
  attempt,
}: {
  attempt: MyAttemptReview;
}): React.JSX.Element {
  const answersByBlock = useMemo(() => {
    const m = new Map<string, GradingAnswer>();
    for (const a of attempt.answers) m.set(a.block_id, a);
    return m;
  }, [attempt]);

  const questionBlocks = useMemo(
    () =>
      attempt.blocks.filter(
        (b) =>
          b.type === "mcq" ||
          b.type === "fill_blank" ||
          b.type === "free_text" ||
          b.type === "voice",
      ),
    [attempt],
  );

  const isPending = attempt.pending_count > 0 || attempt.final_score === null;

  return (
    <ViewerShell
      courseTitle={attempt.course_title}
      breadcrumb={attempt.quiz_title}
      exitHref="/student/attempts"
      sidebar={
        <ReviewSidebar
          questionBlocks={questionBlocks}
          answersByBlock={answersByBlock}
        />
      }
      topRight={<TopScore attempt={attempt} />}
      bottomBar={
        <>
          <span className="text-sm text-muted-foreground">
            {isPending
              ? "Certaines questions sont en attente de correction"
              : "Toutes les questions sont corrigees"}
          </span>
          <Link href={`/student/courses/${attempt.course_id}`}>
            <Button variant="outline">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Retour au cours
            </Button>
          </Link>
        </>
      }
    >
      {/* Header */}
      <div className="space-y-3 pb-6">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Badge className={LEVEL_BADGE_COLORS[attempt.course_level]}>
            {attempt.course_level}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Correction
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Soumis le{" "}
            {format(new Date(attempt.submitted_at), "d MMM yyyy 'a' HH:mm", {
              locale: fr,
            })}
          </span>
          {attempt.graded_at && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Corrige le{" "}
              {format(new Date(attempt.graded_at), "d MMM yyyy", { locale: fr })}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          {attempt.quiz_title}
        </h1>
        <FinalScoreBanner attempt={attempt} />
      </div>

      <Separator className="mb-6" />

      <div className="space-y-4">
        {(() => {
          let questionIndex = 0;
          return attempt.blocks.map((block) => {
            const isQuestion =
              block.type === "mcq" ||
              block.type === "fill_blank" ||
              block.type === "free_text" ||
              block.type === "voice";
            const index = isQuestion ? questionIndex++ : -1;
            return (
              <ReviewBlockCard
                key={block.id}
                block={block}
                index={index}
                answer={answersByBlock.get(block.id) ?? null}
              />
            );
          });
        })()}
      </div>
    </ViewerShell>
  );
}

// ── Top-bar + banner score indicators ──────────────────────────────

function TopScore({
  attempt,
}: {
  attempt: MyAttemptReview;
}): React.JSX.Element {
  if (attempt.final_score !== null) {
    const tone =
      attempt.final_score >= 70
        ? "bg-emerald-100 text-emerald-900"
        : attempt.final_score >= 50
          ? "bg-amber-100 text-amber-900"
          : "bg-rose-100 text-rose-900";
    return (
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${tone}`}
      >
        {attempt.final_score}%
      </span>
    );
  }
  if (attempt.auto_score !== null) {
    return (
      <Badge variant="secondary">Auto {attempt.auto_score}% &middot; en attente</Badge>
    );
  }
  return <Badge variant="secondary">En attente</Badge>;
}

function FinalScoreBanner({
  attempt,
}: {
  attempt: MyAttemptReview;
}): React.JSX.Element {
  if (attempt.final_score !== null) {
    const tone =
      attempt.final_score >= 70
        ? "text-emerald-700"
        : attempt.final_score >= 50
          ? "text-amber-700"
          : "text-rose-700";
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Note finale
            </p>
            <p className={`text-3xl font-bold ${tone}`}>
              {attempt.final_score}%
            </p>
          </div>
          {attempt.auto_score !== null &&
            attempt.auto_score !== attempt.final_score && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Auto-correction
                </p>
                <p className="text-lg font-medium text-muted-foreground">
                  {attempt.auto_score}%
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <Clock className="h-5 w-5 text-amber-700" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-950">
            En attente de correction
          </p>
          <p className="text-xs text-muted-foreground">
            {attempt.pending_count} question
            {attempt.pending_count !== 1 ? "s" : ""} a corriger par votre
            instructeur
          </p>
        </div>
        {attempt.auto_score !== null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Auto-correction
            </p>
            <p className="text-lg font-medium text-muted-foreground">
              {attempt.auto_score}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sidebar: question list with correctness icons ──────────────────

function ReviewSidebar({
  questionBlocks,
  answersByBlock,
}: {
  questionBlocks: QuizBlock[];
  answersByBlock: Map<string, GradingAnswer>;
}): React.JSX.Element {
  return (
    <div className="p-3">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Questions
      </p>
      <ul className="space-y-0.5">
        {questionBlocks.map((block, index) => {
          const answer = answersByBlock.get(block.id) ?? null;
          return (
            <li key={block.id}>
              <a
                href={`#question-${block.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
              >
                <QuestionStatusIcon
                  type={block.type as BlockType}
                  answer={answer}
                />
                <span className="truncate">Question {index + 1}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuestionStatusIcon({
  type,
  answer,
}: {
  type: BlockType;
  answer: GradingAnswer | null;
}): React.JSX.Element {
  if (isManualBlock(type)) {
    if (!answer?.graded_at)
      return <HelpCircle className="h-4 w-4 text-amber-600" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (answer?.is_correct === true)
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (answer?.is_correct === false)
    return <XCircle className="h-4 w-4 text-rose-600" />;
  return <Circle className="h-4 w-4 text-muted-foreground/50" />;
}

function SidebarSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  );
}

// ── Per-block review card ──────────────────────────────────────────

function ReviewBlockCard({
  block,
  index,
  answer,
}: {
  block: QuizBlock;
  index: number;
  answer: GradingAnswer | null;
}): React.JSX.Element {
  const type = block.type as BlockType;
  const content = block.content as Record<string, unknown>;
  const weight = Number(block.weight ?? 0);
  const isQuestion =
    type === "mcq" ||
    type === "fill_blank" ||
    type === "free_text" ||
    type === "voice";

  return (
    <Card id={`question-${block.id}`} className="scroll-mt-20">
      {isQuestion && (
        <QuestionHeader
          index={index}
          weight={weight}
          type={type}
          answer={answer}
        />
      )}

      <CardContent className="space-y-3 py-4">
        {type === "section" && (
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {(content.title as string) || ""}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}
        {type === "text" && <TextBlockView content={content} />}
        {type === "audio" && <AudioBlockView content={content} />}
        {type === "image" && <ImageBlockView content={content} />}
        {type === "mcq" && <McqReviewView content={content} answer={answer} />}
        {type === "fill_blank" && (
          <FillBlankReviewView content={content} answer={answer} />
        )}
        {type === "free_text" && (
          <>
            <FreeTextPromptView content={content} />
            <FreeTextAnswerView answer={answer} />
            <InstructorFeedbackView feedback={answer?.instructor_feedback ?? null} />
          </>
        )}
        {type === "voice" && (
          <>
            <VoicePromptView content={content} />
            <VoiceAnswerView answer={answer} />
            <InstructorFeedbackView feedback={answer?.instructor_feedback ?? null} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
