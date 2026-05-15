"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { useGradeAttempt } from "@/lib/hooks/useAttempts";
import { isManualBlock, type BlockType } from "@/lib/schemas/quiz.schema";
import type { GradingAnswer, GradingAttempt } from "@/lib/api/attempts.api";
import type { CEFRLevel, QuizBlock } from "@/lib/types";
import {
  AudioBlockView,
  FillBlankReviewView,
  FreeTextAnswerView,
  FreeTextPromptView,
  ImageBlockView,
  McqReviewView,
  QuestionHeader,
  TextBlockView,
  VoiceAnswerView,
  VoicePromptView,
} from "@/components/course/quiz-review/quiz-review-blocks";

interface AttemptGradingPaneProps {
  attempt: GradingAttempt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GradeDraft {
  score: string;
  feedback: string;
}

export function AttemptGradingPane({
  attempt,
  open,
  onOpenChange,
}: AttemptGradingPaneProps): React.JSX.Element {
  const { mutate: gradeAttempt, isPending } = useGradeAttempt();

  const answersByBlock = useMemo(() => {
    const m = new Map<string, GradingAnswer>();
    if (attempt) for (const a of attempt.answers) m.set(a.block_id, a);
    return m;
  }, [attempt]);

  const manualBlocks = useMemo(
    () =>
      attempt
        ? attempt.blocks.filter((b) => isManualBlock(b.type as BlockType))
        : [],
    [attempt],
  );

  const [trackedId, setTrackedId] = useState<string | null>(
    attempt?.attempt_id ?? null,
  );
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>(() =>
    seedDrafts(manualBlocks, answersByBlock),
  );

  const currentId = attempt?.attempt_id ?? null;
  if (currentId !== trackedId) {
    setTrackedId(currentId);
    setDrafts(seedDrafts(manualBlocks, answersByBlock));
  }

  const updateDraft = (blockId: string, patch: Partial<GradeDraft>): void => {
    setDrafts((prev) => ({
      ...prev,
      [blockId]: { ...prev[blockId], ...patch },
    }));
  };

  const handleSave = (): void => {
    if (!attempt) return;

    const grades: {
      answer_id: string;
      block_weight: number;
      earned_weight: number;
      feedback: string | null;
    }[] = [];

    for (const block of manualBlocks) {
      const answer = answersByBlock.get(block.id);
      if (!answer) continue;
      const draft = drafts[block.id];
      if (!draft) continue;

      const parsed = Number(draft.score);
      const weight = Number(block.weight ?? 0);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > weight) return;

      grades.push({
        answer_id: answer.id,
        block_weight: weight,
        earned_weight: parsed,
        feedback: draft.feedback.trim() ? draft.feedback.trim() : null,
      });
    }

    if (grades.length === 0) return;

    gradeAttempt(
      { attempt_id: attempt.attempt_id, grades },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto !max-w-full md:!max-w-md lg:!max-w-lg">
        {!attempt ? (
          <div className="p-6 text-sm text-muted-foreground">
            No attempt selected.
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{attempt.student_name}</SheetTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  className={
                    LEVEL_BADGE_COLORS[attempt.course_level as CEFRLevel]
                  }
                >
                  {attempt.course_level}
                </Badge>
                <span className="truncate">{attempt.course_title}</span>
                <span>&middot;</span>
                <span className="truncate">{attempt.quiz_title}</span>
              </div>
              <AttemptSummary attempt={attempt} />
            </SheetHeader>

            <div className="space-y-3 px-4 py-4">
              {attempt.blocks.map((block, index) => (
                <BlockView
                  key={block.id}
                  block={block}
                  index={index}
                  answer={answersByBlock.get(block.id) ?? null}
                  draft={drafts[block.id]}
                  onDraftChange={(patch) => updateDraft(block.id, patch)}
                  disabled={isPending}
                />
              ))}
            </div>

            <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save grades
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function seedDrafts(
  blocks: QuizBlock[],
  answersByBlock: Map<string, GradingAnswer>,
): Record<string, GradeDraft> {
  const out: Record<string, GradeDraft> = {};
  for (const b of blocks) {
    const a = answersByBlock.get(b.id);
    const weight = Number(b.weight ?? 0);
    out[b.id] = {
      score:
        a?.earned_weight !== null && a?.earned_weight !== undefined
          ? String(a.earned_weight)
          : String(weight),
      feedback: a?.instructor_feedback ?? "",
    };
  }
  return out;
}

function AttemptSummary({
  attempt,
}: {
  attempt: GradingAttempt;
}): React.JSX.Element {
  const gradedManual = attempt.manual_count - attempt.pending_count;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      {attempt.auto_score !== null && (
        <Badge variant="secondary">Auto : {attempt.auto_score}%</Badge>
      )}
      {attempt.pending_count > 0 ? (
        <Badge variant="secondary">
          {attempt.pending_count} / {attempt.manual_count} en attente
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-emerald-200 text-emerald-700"
        >
          Tout corrige ({gradedManual} / {attempt.manual_count})
        </Badge>
      )}
      {attempt.final_score !== null && (
        <Badge variant="outline">Final : {attempt.final_score}%</Badge>
      )}
    </div>
  );
}

// ── Block rendering (grading mode) ─────────────────────────────────

function BlockView({
  block,
  index,
  answer,
  draft,
  onDraftChange,
  disabled,
}: {
  block: QuizBlock;
  index: number;
  answer: GradingAnswer | null;
  draft: GradeDraft | undefined;
  onDraftChange: (patch: Partial<GradeDraft>) => void;
  disabled: boolean;
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
    <Card>
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
            <GradeForm
              weight={weight}
              draft={draft}
              onChange={onDraftChange}
              disabled={disabled}
              blockId={block.id}
              modelAnswer={block.model_answer}
              gradingNotes={block.grading_notes}
            />
          </>
        )}
        {type === "voice" && (
          <>
            <VoicePromptView content={content} />
            <VoiceAnswerView answer={answer} />
            <GradeForm
              weight={weight}
              draft={draft}
              onChange={onDraftChange}
              disabled={disabled}
              blockId={block.id}
              modelAnswer={block.model_answer}
              gradingNotes={block.grading_notes}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GradeForm({
  weight,
  draft,
  onChange,
  disabled,
  blockId,
  modelAnswer,
  gradingNotes,
}: {
  weight: number;
  draft: GradeDraft | undefined;
  onChange: (patch: Partial<GradeDraft>) => void;
  disabled: boolean;
  blockId: string;
  modelAnswer: string | null;
  gradingNotes: string | null;
}): React.JSX.Element | null {
  if (!draft) return null;
  const error = scoreError(draft.score, weight);
  return (
    <div className="space-y-3 rounded-md border bg-amber-50/40 p-3">
      {(modelAnswer || gradingNotes) && (
        <div className="space-y-2">
          {modelAnswer && (
            <details className="rounded-md border bg-background/60 p-2 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Reponse modele
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm">{modelAnswer}</p>
            </details>
          )}
          {gradingNotes && (
            <details className="rounded-md border bg-background/60 p-2 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Notes de correction
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm">{gradingNotes}</p>
            </details>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <Label
          htmlFor={`score-${blockId}`}
          className="text-xs uppercase tracking-wide"
        >
          Note (sur {weight})
        </Label>
        <Input
          id={`score-${blockId}`}
          type="number"
          min={0}
          max={weight}
          step={0.5}
          value={draft.score}
          onChange={(e) => onChange({ score: e.target.value })}
          disabled={disabled}
          aria-invalid={error !== null}
          className={`max-w-35 ${error ? "border-rose-400 focus-visible:ring-rose-300" : ""}`}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      <div className="grid gap-2">
        <Label
          htmlFor={`feedback-${blockId}`}
          className="text-xs uppercase tracking-wide"
        >
          Commentaire (optionnel)
        </Label>
        <Textarea
          id={`feedback-${blockId}`}
          placeholder="Retour pour l'etudiant..."
          rows={3}
          value={draft.feedback}
          onChange={(e) => onChange({ feedback: e.target.value })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function scoreError(rawScore: string, weight: number): string | null {
  if (rawScore.trim() === "") return "Note requise";
  const parsed = Number(rawScore);
  if (Number.isNaN(parsed)) return "Note invalide";
  if (parsed < 0) return "La note ne peut pas etre negative";
  if (parsed > weight) return `La note ne peut pas depasser ${weight}`;
  return null;
}
