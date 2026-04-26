"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { materialsApi } from "@/lib/api/materials.api";
import { isManualBlock, type BlockType } from "@/lib/schemas/quiz.schema";

/**
 * Minimal answer shape for review rendering. Compatible with both the
 * instructor's `GradingAnswer` and the student's equivalent — any consumer
 * that reads `student_answers` rows can pass them through.
 */
export interface ReviewAnswer {
  id: string;
  block_id: string;
  answer: Record<string, unknown>;
  is_correct: boolean | null;
  earned_weight: number | null;
  instructor_feedback: string | null;
  graded_at: string | null;
}

// ── Question header badge row ──────────────────────────────────────

export function QuestionHeader({
  index,
  weight,
  type,
  answer,
}: {
  index: number;
  weight: number;
  type: BlockType;
  answer: ReviewAnswer | null;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        Question {index + 1}
      </span>
      <div className="flex items-center gap-2">
        {weight > 0 && (
          <span className="text-xs text-muted-foreground">Poids : {weight}</span>
        )}
        {isManualBlock(type) ? (
          answer?.graded_at ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {answer.earned_weight} / {weight}
            </span>
          ) : (
            <Badge variant="secondary">En attente</Badge>
          )
        ) : answer?.is_correct === true ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {answer.earned_weight} / {weight}
          </span>
        ) : answer?.is_correct === false ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
            <XCircle className="h-3.5 w-3.5" />0 / {weight}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Material blocks (read-only display) ────────────────────────────

export function TextBlockView({
  content,
}: {
  content: Record<string, unknown>;
}): React.JSX.Element {
  const html = (content.html as string) || "";
  if (!html)
    return <p className="text-sm italic text-muted-foreground">Passage vide</p>;
  return <RichTextViewer content={html} />;
}

export function AudioBlockView({
  content,
}: {
  content: Record<string, unknown>;
}): React.JSX.Element {
  const storagePath = (content.audio_url as string) || "";
  const caption = (content.caption as string) || "";
  const signedUrl = useSignedUrl(storagePath);

  if (!storagePath)
    return <p className="text-sm italic text-muted-foreground">Aucun audio</p>;

  return (
    <div className="space-y-2">
      {caption && <p className="text-sm font-medium text-amber-950">{caption}</p>}
      {signedUrl ? (
        <audio controls className="w-full">
          <source src={signedUrl} />
        </audio>
      ) : (
        <Skeleton className="h-12 w-full rounded-lg" />
      )}
    </div>
  );
}

export function ImageBlockView({
  content,
}: {
  content: Record<string, unknown>;
}): React.JSX.Element {
  const storagePath = (content.image_url as string) || "";
  const alt = (content.alt as string) || "";
  const signedUrl = useSignedUrl(storagePath);

  if (!storagePath)
    return <p className="text-sm italic text-muted-foreground">Aucune image</p>;

  return (
    <div className="space-y-2">
      {signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signedUrl}
          alt={alt}
          className="max-h-80 w-full rounded-lg border border-border object-contain bg-muted/10"
        />
      ) : (
        <Skeleton className="h-48 w-full rounded-lg" />
      )}
      {alt && <p className="text-xs text-muted-foreground">{alt}</p>}
    </div>
  );
}

// ── Auto-graded blocks (read-only with correctness overlay) ────────

export function McqReviewView({
  content,
  answer,
}: {
  content: Record<string, unknown>;
  answer: ReviewAnswer | null;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  const options =
    (content.options as
      | { id: string; label: string; is_correct: boolean }[]
      | undefined) ?? [];
  const allowMultiple = content.allow_multiple === true;

  const selected = new Set<string>(
    answer
      ? allowMultiple
        ? Array.isArray(answer.answer.selected)
          ? (answer.answer.selected as string[])
          : []
        : typeof answer.answer.selected === "string"
          ? [answer.answer.selected as string]
          : []
      : [],
  );

  return (
    <div className="space-y-3">
      {prompt && <p className="text-sm font-medium text-amber-950">{prompt}</p>}
      <ul className="space-y-1.5">
        {options.map((opt) => {
          const isPicked = selected.has(opt.id);
          const isCorrect = opt.is_correct;
          const tone = optionTone(isPicked, isCorrect);
          return (
            <li
              key={opt.id}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${tone.bg} ${tone.border}`}
            >
              <OptionIcon isPicked={isPicked} isCorrect={isCorrect} />
              <span className={tone.text}>{opt.label}</span>
              {isCorrect && !isPicked && (
                <span className="ml-auto text-[11px] text-emerald-700">
                  Bonne reponse
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FillBlankReviewView({
  content,
  answer,
}: {
  content: Record<string, unknown>;
  answer: ReviewAnswer | null;
}): React.JSX.Element {
  const sentence = (content.sentence as string) || "";
  const options =
    (content.options as
      | { id: string; label: string; is_correct: boolean }[]
      | undefined) ?? [];
  const selectedId = (answer?.answer.selected as string | undefined) ?? "";

  return (
    <div className="space-y-3">
      {sentence && (
        <p className="text-sm font-medium text-amber-950">{sentence}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isPicked = opt.id === selectedId;
          const tone = optionTone(isPicked, opt.is_correct);
          return (
            <span
              key={opt.id}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${tone.bg} ${tone.border} ${tone.text}`}
            >
              <OptionIcon isPicked={isPicked} isCorrect={opt.is_correct} />
              {opt.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Manual block answer views (student-submitted content) ──────────

export function FreeTextPromptView({
  content,
}: {
  content: Record<string, unknown>;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  return prompt ? (
    <p className="text-sm font-medium text-amber-950">{prompt}</p>
  ) : (
    <p className="text-sm italic text-muted-foreground">(pas de consigne)</p>
  );
}

export function FreeTextAnswerView({
  answer,
}: {
  answer: ReviewAnswer | null;
}): React.JSX.Element {
  const text = ((answer?.answer.text as string) || "").trim();
  if (!text)
    return <p className="text-sm italic text-muted-foreground">Reponse vide</p>;
  return (
    <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
      {text}
    </div>
  );
}

export function VoicePromptView({
  content,
}: {
  content: Record<string, unknown>;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  return prompt ? (
    <p className="text-sm font-medium text-amber-950">{prompt}</p>
  ) : (
    <p className="text-sm italic text-muted-foreground">(pas de consigne)</p>
  );
}

export function VoiceAnswerView({
  answer,
}: {
  answer: ReviewAnswer | null;
}): React.JSX.Element {
  const storagePath = (answer?.answer.audio_url as string) || "";
  const duration = Number(answer?.answer.duration_seconds ?? 0);
  const signedUrl = useSignedUrl(storagePath);

  if (!storagePath)
    return (
      <p className="text-sm italic text-muted-foreground">
        Pas d&apos;enregistrement
      </p>
    );

  return (
    <div className="space-y-2">
      {signedUrl ? (
        <audio controls className="w-full">
          <source src={signedUrl} />
        </audio>
      ) : (
        <Skeleton className="h-12 w-full rounded-lg" />
      )}
      {duration > 0 && (
        <p className="text-xs text-muted-foreground">
          Duree : {Math.round(duration)}s
        </p>
      )}
    </div>
  );
}

/** Instructor's written feedback, shown to the student in review mode */
export function InstructorFeedbackView({
  feedback,
}: {
  feedback: string | null;
}): React.JSX.Element | null {
  const trimmed = feedback?.trim();
  if (!trimmed) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
        Commentaire de l&apos;instructeur
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-amber-950">{trimmed}</p>
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────

export function optionTone(
  isPicked: boolean,
  isCorrect: boolean,
): { bg: string; border: string; text: string } {
  if (isPicked && isCorrect)
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      text: "text-emerald-900",
    };
  if (isPicked && !isCorrect)
    return {
      bg: "bg-rose-50",
      border: "border-rose-300",
      text: "text-rose-900",
    };
  if (!isPicked && isCorrect)
    return {
      bg: "bg-emerald-50/40",
      border: "border-emerald-200",
      text: "text-emerald-800",
    };
  return {
    bg: "bg-muted/20",
    border: "border-border",
    text: "text-muted-foreground",
  };
}

export function OptionIcon({
  isPicked,
  isCorrect,
}: {
  isPicked: boolean;
  isCorrect: boolean;
}): React.JSX.Element {
  if (isPicked && isCorrect)
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (isPicked && !isCorrect)
    return <XCircle className="h-4 w-4 text-rose-600" />;
  if (isCorrect)
    return <CheckCircle2 className="h-4 w-4 text-emerald-500/60" />;
  return <span className="h-4 w-4" />;
}

export function useSignedUrl(storagePath: string): string | null {
  const [trackedPath, setTrackedPath] = useState(storagePath);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  if (trackedPath !== storagePath) {
    setTrackedPath(storagePath);
    setSignedUrl(null);
  }

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  return signedUrl;
}
