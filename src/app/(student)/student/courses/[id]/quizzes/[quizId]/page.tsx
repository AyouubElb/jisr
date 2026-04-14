"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  History,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuiz } from "@/lib/hooks/useQuizzes";
import { useMyAttempts, useSubmitQuiz } from "@/lib/hooks/useAttempts";
import { materialsApi } from "@/lib/api/materials.api";
import type { BlockType } from "@/lib/schemas/quiz.schema";
import type { QuizBlock, StudentAttempt } from "@/lib/types";
import type { SubmittedAnswerInput } from "@/lib/api/attempts.api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AnswerState {
  selected_option_id?: string;
  text_answer?: string;
}

export default function StudentQuizPage(): React.JSX.Element {
  const params = useParams();
  const courseId = params.id as string;
  const quizId = params.quizId as string;

  const { data: quiz, isLoading } = useQuiz(quizId);
  const { data: attempts } = useMyAttempts(quizId);
  const { mutate: submitQuiz, isPending: isSubmitting } = useSubmitQuiz();

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [resultAttempt, setResultAttempt] = useState<StudentAttempt | null>(null);

  // Sort blocks by order + extract question blocks for numbering
  const sortedBlocks = useMemo(
    () => quiz?.quiz_blocks.slice().sort((a, b) => a.order - b.order) ?? [],
    [quiz],
  );
  const questionBlocks = useMemo(
    () =>
      sortedBlocks.filter(
        (b) => b.type === "mcq" || b.type === "fill_blank" || b.type === "free_text",
      ),
    [sortedBlocks],
  );

  const answeredCount = questionBlocks.filter((b) => {
    const a = answers[b.id];
    if (!a) return false;
    if (b.type === "mcq") return !!a.selected_option_id;
    return !!a.text_answer && a.text_answer.trim().length > 0;
  }).length;

  const handleAnswerChange = (blockId: string, patch: AnswerState): void => {
    setAnswers((prev) => ({ ...prev, [blockId]: { ...prev[blockId], ...patch } }));
  };

  const handleSubmit = (): void => {
    if (!quiz) return;
    const payload: SubmittedAnswerInput[] = questionBlocks.map((b) => {
      const a = answers[b.id] ?? {};
      return {
        block_id: b.id,
        selected_option_id: a.selected_option_id ?? null,
        text_answer: a.text_answer ?? null,
      };
    });

    submitQuiz(
      { quizId, blocks: quiz.quiz_blocks, answers: payload, courseId },
      {
        onSuccess: (attempt) => {
          setResultAttempt(attempt);
        },
      },
    );
  };

  // ── Result screen ─────────────────────────────────────────────────
  if (resultAttempt && quiz) {
    return (
      <QuizResultView
        quizTitle={quiz.title}
        score={resultAttempt.score}
        maxScore={resultAttempt.max_score}
        status={resultAttempt.status}
        courseId={courseId}
        onRetry={() => {
          setResultAttempt(null);
          setAnswers({});
        }}
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading || !quiz) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalPoints = questionBlocks.reduce((s, b) => s + (b.points ?? 0), 0);

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href={`/student/courses/${courseId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-amber-950">{quiz.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
              {quiz.time_limit_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {quiz.time_limit_minutes} min
                </span>
              )}
              <span>{questionBlocks.length} question{questionBlocks.length !== 1 ? "s" : ""}</span>
              <span>{totalPoints} pts</span>
              {attempts && attempts.length > 0 && (
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {attempts.length} tentative{attempts.length !== 1 ? "s" : ""} précédente{attempts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {quiz.description && (
              <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>
            )}
          </div>
        </div>

        {/* Previous attempts */}
        {attempts && attempts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Mes tentatives précédentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attempts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {a.submitted_at
                      ? format(new Date(a.submitted_at), "d MMM yyyy 'à' HH:mm", { locale: fr })
                      : "En cours"}
                  </span>
                  <div className="flex items-center gap-2">
                    {a.status === "submitted" && (
                      <Badge variant="outline" className="text-[10px]">En attente de correction</Badge>
                    )}
                    <span className="font-medium">
                      {a.score ?? "-"} / {a.max_score ?? "-"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Blocks */}
        {sortedBlocks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ce quiz ne contient aucun bloc.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(() => {
              let questionIndex = 0;
              return sortedBlocks.map((block) => {
                const isQuestion =
                  block.type === "mcq" || block.type === "fill_blank" || block.type === "free_text";
                const currentIndex = isQuestion ? questionIndex++ : -1;
                return (
                  <StudentBlockView
                    key={block.id}
                    block={block}
                    questionIndex={currentIndex}
                    answer={answers[block.id]}
                    onAnswerChange={(patch) => handleAnswerChange(block.id, patch)}
                  />
                );
              });
            })()}
          </div>
        )}

        {/* Submit bar */}
        {questionBlocks.length > 0 && (
          <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-border bg-card/95 backdrop-blur px-5 py-3 shadow-lg">
            <span className="text-sm text-muted-foreground">
              {answeredCount} / {questionBlocks.length} question{questionBlocks.length !== 1 ? "s" : ""} répondue{answeredCount !== 1 ? "s" : ""}
            </span>
            <Button
              disabled={isSubmitting}
              onClick={() => setConfirmSubmit(true)}
            >
              {isSubmitting ? "Envoi..." : "Soumettre le quiz"}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Soumettre le quiz ?"
        description={
          answeredCount < questionBlocks.length
            ? `Vous n'avez répondu qu'à ${answeredCount} question${answeredCount !== 1 ? "s" : ""} sur ${questionBlocks.length}. Voulez-vous vraiment soumettre ?`
            : "Vos réponses seront enregistrées et notées."
        }
        confirmLabel="Soumettre"
        cancelLabel="Continuer le quiz"
        isPending={isSubmitting}
        onConfirm={handleSubmit}
      />
    </>
  );
}

// ── Result view ─────────────────────────────────────────────────────

function QuizResultView({
  quizTitle,
  score,
  maxScore,
  status,
  courseId,
  onRetry,
}: {
  quizTitle: string;
  score: number | null;
  maxScore: number | null;
  status: string;
  courseId: string;
  onRetry: () => void;
}): React.JSX.Element {
  const percentage = score !== null && maxScore && maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : null;

  const tone =
    percentage === null
      ? "text-muted-foreground"
      : percentage >= 70
      ? "text-emerald-600"
      : percentage >= 50
      ? "text-amber-600"
      : "text-rose-600";

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Quiz soumis
            </p>
            <h2 className="text-2xl font-bold text-amber-950">{quizTitle}</h2>
          </div>
          {percentage !== null ? (
            <>
              <p className={`text-5xl font-bold ${tone}`}>{percentage}%</p>
              <p className="text-sm text-muted-foreground">
                {score} / {maxScore} points
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Score en attente
            </p>
          )}
          {status === "submitted" && (
            <Badge variant="outline">
              Certaines questions en attente de correction manuelle
            </Badge>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Button variant="outline" onClick={onRetry}>
              Refaire le quiz
            </Button>
            <Link href={`/student/courses/${courseId}`}>
              <Button>Retour au cours</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Block views (student mode, no correct answers revealed) ─────────

function StudentBlockView({
  block,
  questionIndex,
  answer,
  onAnswerChange,
}: {
  block: QuizBlock;
  questionIndex: number;
  answer: AnswerState | undefined;
  onAnswerChange: (patch: AnswerState) => void;
}): React.JSX.Element {
  const type = block.type as BlockType;
  const content = block.content as Record<string, unknown>;
  const isQuestion = type === "mcq" || type === "fill_blank" || type === "free_text";

  return (
    <Card>
      {isQuestion && (
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Question {questionIndex + 1}
          </span>
          {block.points !== null && (
            <span className="text-xs text-muted-foreground">
              {block.points} pt{block.points !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
      <CardContent className="py-4">
        {type === "text" && <TextView content={content} />}
        {type === "audio" && <AudioView content={content} />}
        {type === "image" && <ImageView content={content} />}
        {type === "mcq" && (
          <McqView
            content={content}
            selectedId={answer?.selected_option_id}
            onSelect={(id) => onAnswerChange({ selected_option_id: id })}
          />
        )}
        {type === "fill_blank" && (
          <FillBlankView
            content={content}
            value={answer?.text_answer ?? ""}
            onChange={(text) => onAnswerChange({ text_answer: text })}
          />
        )}
        {type === "free_text" && (
          <FreeTextView
            content={content}
            value={answer?.text_answer ?? ""}
            onChange={(text) => onAnswerChange({ text_answer: text })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TextView({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const html = (content.html as string) || "";
  if (!html) return <p className="text-sm italic text-muted-foreground">Passage vide</p>;
  return <RichTextViewer content={html} />;
}

function AudioView({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const storagePath = (content.audio_url as string) || "";
  const caption = (content.caption as string) || "";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [storagePath]);

  if (!storagePath) return <p className="text-sm italic text-muted-foreground">Aucun audio</p>;

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

function ImageView({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const storagePath = (content.image_url as string) || "";
  const alt = (content.alt as string) || "";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [storagePath]);

  if (!storagePath) return <p className="text-sm italic text-muted-foreground">Aucune image</p>;

  return (
    <div className="space-y-2">
      {signedUrl ? (
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

function McqView({
  content,
  selectedId,
  onSelect,
}: {
  content: Record<string, unknown>;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  // Strip is_correct before rendering to student — never leak correct answer
  const options = ((content.options as { id: string; label: string }[]) || []).map((o) => ({
    id: o.id,
    label: o.label,
  }));

  return (
    <div className="space-y-3">
      {prompt && <p className="text-sm font-medium text-amber-950">{prompt}</p>}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className="text-sm">{opt.label || "..."}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FillBlankView({
  content,
  value,
  onChange,
}: {
  content: Record<string, unknown>;
  value: string;
  onChange: (text: string) => void;
}): React.JSX.Element {
  const sentence = (content.sentence as string) || "";
  const parts = sentence.split("___");

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm leading-relaxed">
      {parts.map((part, idx) => (
        <span key={idx} className="inline-flex items-center gap-1">
          <span>{part}</span>
          {idx < parts.length - 1 && (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="inline-block h-8 w-32 text-center text-sm"
              placeholder="..."
            />
          )}
        </span>
      ))}
    </div>
  );
}

function FreeTextView({
  content,
  value,
  onChange,
}: {
  content: Record<string, unknown>;
  value: string;
  onChange: (text: string) => void;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  const minWords = content.min_words as number | undefined;
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {prompt && <p className="text-sm font-medium text-amber-950">{prompt}</p>}
      <Textarea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écrivez votre réponse ici..."
        className="resize-none"
      />
      {minWords && (
        <p className="text-xs text-muted-foreground">
          {wordCount} / {minWords} mots minimum
          {wordCount < minWords && (
            <XCircle className="inline ml-1 h-3 w-3 text-rose-500" />
          )}
        </p>
      )}
    </div>
  );
}
