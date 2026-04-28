"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  History,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ViewerShell } from "@/components/layout/viewer-shell";
import {
  CurriculumSidebar,
  CurriculumSidebarSkeleton,
} from "@/components/layout/curriculum-sidebar";
import { QuizTimer } from "@/components/course/quiz-timer";
import { AudioRecorder } from "@/components/course/audio-recorder";
import { useCourse } from "@/lib/hooks/useCourses";
import { useMyCompletions } from "@/lib/hooks/useCompletions";
import { useQuiz } from "@/lib/hooks/useQuizzes";
import {
  useMyAttempts,
  useMyCourseAttempts,
  useStartAttempt,
  useSubmitQuiz,
} from "@/lib/hooks/useAttempts";
import { materialsApi } from "@/lib/api/materials.api";
import type { BlockType } from "@/lib/schemas/quiz.schema";
import type { QuizBlock, QuizWithBlocks, Lesson, StudentAttempt } from "@/lib/types";
import type { SubmittedAnswerInput } from "@/lib/api/attempts.api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AnswerState {
  selected_option_id?: string;
  selected_option_ids?: string[];
  text_answer?: string;
  audio_url?: string;
  duration_seconds?: number;
}

// ── localStorage helpers for draft answer persistence ─────────────────

const STORAGE_PREFIX = "quiz_draft_";

function draftKey(attemptId: string): string {
  return `${STORAGE_PREFIX}${attemptId}`;
}

function saveDraft(attemptId: string, answers: Record<string, AnswerState>): void {
  try {
    localStorage.setItem(draftKey(attemptId), JSON.stringify(answers));
  } catch {
    // Storage full or unavailable — silent fail, answers still in React state
  }
}

function loadDraft(attemptId: string): Record<string, AnswerState> | null {
  try {
    const raw = localStorage.getItem(draftKey(attemptId));
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, AnswerState>;
  } catch {
    return null;
  }
}

function clearDraft(attemptId: string): void {
  try {
    localStorage.removeItem(draftKey(attemptId));
  } catch {
    // silent
  }
}

/** Check if a timed attempt has passed its deadline */
function isAttemptExpired(attempt: StudentAttempt, timeLimitMinutes: number | null): boolean {
  if (!timeLimitMinutes) return false;
  const deadline = new Date(attempt.started_at).getTime() + timeLimitMinutes * 60 * 1000;
  return Date.now() >= deadline;
}

/** Flat navigation entry across a course — same shape used by the lesson viewer. */
interface FlatItem {
  kind: "lesson" | "quiz";
  id: string;
  title: string;
  sectionTitle: string;
  sectionIndex: number;
  order: number;
  lesson?: Lesson;
  quiz?: QuizWithBlocks;
}

export default function StudentQuizPage(): React.JSX.Element {
  const params = useParams();
  const courseId = params.id as string;
  const quizId = params.quizId as string;

  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: quiz, isLoading: quizLoading } = useQuiz(quizId);
  const { data: attempts } = useMyAttempts(quizId);
  const { data: completions } = useMyCompletions(courseId);
  const { data: courseAttempts } = useMyCourseAttempts(courseId);
  const { mutate: submitQuiz, isPending: isSubmitting } = useSubmitQuiz();
  const { mutate: startAttempt, isPending: isStarting } = useStartAttempt();

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [resultAttempt, setResultAttempt] = useState<StudentAttempt | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<StudentAttempt | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // Guards against double-submit when the timer expires while the user is
  // already submitting manually (or vice versa).
  const submittedRef = useRef(false);
  // Tracks whether we already ran the resume-attempt logic to avoid
  // re-triggering on every `attempts` refetch.
  const resumedRef = useRef(false);

  // ── Resume existing in-progress attempt on page load ───────────────
  useEffect(() => {
    if (!attempts || !quiz || resumedRef.current) return;
    const inProgress = attempts.find((a) => a.status === "in_progress");
    if (!inProgress) return;

    resumedRef.current = true;
    const savedAnswers = loadDraft(inProgress.id);

    if (isAttemptExpired(inProgress, quiz.time_limit_minutes)) {
      // Case 2: came back after deadline — auto-submit with saved answers
      setActiveAttempt(inProgress);
      if (savedAnswers) setAnswers(savedAnswers);
      // We can't call handleSubmit here because it depends on state that
      // hasn't flushed yet. Instead, set a flag and let a separate effect
      // handle the auto-submit after state has settled.
      submittedRef.current = false;
    } else {
      // Case 1: came back before deadline — resume quiz
      setActiveAttempt(inProgress);
      if (savedAnswers) setAnswers(savedAnswers);
    }
  }, [attempts, quiz]);

  const autoSubmitFiredRef = useRef(false);

  const completedLessonIds = useMemo(
    () => new Set(completions?.map((c) => c.lesson_id) ?? []),
    [completions],
  );
  const submittedQuizIds = useMemo(
    () => new Set(courseAttempts?.map((a) => a.quiz_id) ?? []),
    [courseAttempts],
  );

  // Flat list of course items — lessons + quizzes interleaved per section.
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!course?.sections) return [];
    const out: FlatItem[] = [];
    course.sections.forEach((section, sIdx) => {
      (section.items ?? []).forEach((entry) => {
        if (entry.item_type === "lesson") {
          out.push({
            kind: "lesson",
            id: entry.data.id,
            title: entry.data.title,
            sectionTitle: section.title,
            sectionIndex: sIdx,
            order: entry.position,
            lesson: entry.data,
          });
        } else {
          out.push({
            kind: "quiz",
            id: entry.data.id,
            title: entry.data.title,
            sectionTitle: section.title,
            sectionIndex: sIdx,
            order: entry.position,
            quiz: entry.data,
          });
        }
      });
    });
    return out;
  }, [course]);

  const currentIdx = flatItems.findIndex(
    (f) => f.kind === "quiz" && f.id === quizId,
  );
  const current = currentIdx >= 0 ? flatItems[currentIdx] : null;
  const next =
    currentIdx >= 0 && currentIdx < flatItems.length - 1
      ? flatItems[currentIdx + 1]
      : null;

  // Sort blocks by order + extract question blocks for numbering
  const sortedBlocks = useMemo(
    () => quiz?.quiz_blocks.slice().sort((a, b) => a.order - b.order) ?? [],
    [quiz],
  );
  const questionBlocks = useMemo(
    () =>
      sortedBlocks.filter(
        (b) =>
          b.type === "mcq" ||
          b.type === "fill_blank" ||
          b.type === "free_text" ||
          b.type === "voice",
      ),
    [sortedBlocks],
  );

  const answeredCount = questionBlocks.filter((b) => {
    const a = answers[b.id];
    if (!a) return false;
    if (b.type === "mcq") {
      const content = b.content as { allow_multiple?: boolean };
      return content.allow_multiple
        ? (a.selected_option_ids?.length ?? 0) > 0
        : !!a.selected_option_id;
    }
    if (b.type === "fill_blank") return !!a.selected_option_id;
    if (b.type === "voice") return !!a.audio_url;
    return !!a.text_answer && a.text_answer.trim().length > 0;
  }).length;

  // Auto-expand the section containing the current quiz.
  const currentSectionId = current
    ? course?.sections?.[current.sectionIndex]?.id
    : undefined;
  const effectiveExpanded = useMemo(() => {
    const set = new Set(expandedSections);
    if (currentSectionId) set.add(currentSectionId);
    return set;
  }, [expandedSections, currentSectionId]);

  const toggleSection = (id: string): void => {
    setExpandedSections((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  };

  const hrefFor = (item: FlatItem): string =>
    item.kind === "lesson"
      ? `/student/courses/${courseId}/lessons/${item.id}`
      : `/student/courses/${courseId}/quizzes/${item.id}`;

  const handleAnswerChange = (blockId: string, patch: AnswerState): void => {
    setAnswers((prev) => ({ ...prev, [blockId]: { ...prev[blockId], ...patch } }));
  };

  const handleStart = (): void => {
    submittedRef.current = false;
    autoSubmitFiredRef.current = false;
    startAttempt(quizId, {
      onSuccess: (attempt) => {
        setActiveAttempt(attempt);
      },
    });
  };

  const handleSubmit = useCallback((): void => {
    if (!quiz || !activeAttempt) return;
    if (submittedRef.current) return;
    submittedRef.current = true;

    const payload: SubmittedAnswerInput[] = questionBlocks.map((b) => {
      const a = answers[b.id] ?? {};
      let answerShape: Record<string, unknown> = {};
      if (b.type === "mcq") {
        const content = b.content as { allow_multiple?: boolean };
        answerShape = content.allow_multiple
          ? { selected: a.selected_option_ids ?? [] }
          : { selected: a.selected_option_id ?? "" };
      } else if (b.type === "fill_blank") {
        answerShape = { selected: a.selected_option_id ?? "" };
      } else if (b.type === "free_text") {
        answerShape = { text: a.text_answer ?? "" };
      } else if (b.type === "voice") {
        answerShape = {
          audio_url: a.audio_url ?? "",
          duration_seconds: a.duration_seconds ?? 0,
        };
      }
      return { block_id: b.id, answer: answerShape };
    });

    submitQuiz(
      {
        attemptId: activeAttempt.id,
        quizId,
        blocks: quiz.quiz_blocks,
        answers: payload,
        courseId,
      },
      {
        onSuccess: (attempt) => {
          if (activeAttempt) clearDraft(activeAttempt.id);
          setResultAttempt(attempt);
          setActiveAttempt(null);
          setConfirmSubmit(false);
        },
        onError: () => {
          // Allow retry if the submit failed
          submittedRef.current = false;
        },
      },
    );
  }, [quiz, activeAttempt, questionBlocks, answers, submitQuiz, quizId, courseId]);

  // ── Auto-submit expired attempt after state has settled ─────────────
  // This runs after the resume effect sets activeAttempt + answers for an
  // expired attempt. We check expiry again here to be safe.
  useEffect(() => {
    if (!activeAttempt || !quiz || autoSubmitFiredRef.current) return;
    if (activeAttempt.status !== "in_progress") return;
    if (!isAttemptExpired(activeAttempt, quiz.time_limit_minutes)) return;
    autoSubmitFiredRef.current = true;
    // Defer to next tick so all state is stable
    const id = setTimeout(() => {
      handleSubmit();
    }, 0);
    return () => clearTimeout(id);
  }, [activeAttempt, quiz, handleSubmit]);

  // ── Persist answers to localStorage on every change ─────────────────
  useEffect(() => {
    if (!activeAttempt) return;
    saveDraft(activeAttempt.id, answers);
  }, [answers, activeAttempt]);

  // ── Shared sidebar ──────────────────────────────────────────
  const sidebar =
    courseLoading || !course ? (
      <CurriculumSidebarSkeleton />
    ) : (
      <CurriculumSidebar
        sections={course.sections ?? []}
        courseId={courseId}
        activeItemId={quizId}
        completedLessonIds={completedLessonIds}
        submittedQuizIds={submittedQuizIds}
        expandedSections={effectiveExpanded}
        onToggleSection={toggleSection}
      />
    );

  // ── Loading ─────────────────────────────────────────────────
  if (quizLoading || courseLoading || !quiz) {
    return (
      <ViewerShell
        courseTitle={course?.title ?? ""}
        breadcrumb={current?.sectionTitle}
        exitHref={`/student/courses/${courseId}`}
        loading
        sidebar={sidebar}
      >
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ViewerShell>
    );
  }

  // ── Result screen (inside the same shell, sidebar still visible) ──
  if (resultAttempt) {
    return (
      <ViewerShell
        courseTitle={course?.title ?? ""}
        breadcrumb={current?.sectionTitle}
        exitHref={`/student/courses/${courseId}`}
        sidebar={sidebar}
      >
        <QuizResultView
          quizTitle={quiz.title}
          finalScore={resultAttempt.final_score}
          status={resultAttempt.status}
          courseId={courseId}
          nextItem={next}
          nextHref={next ? hrefFor(next) : null}
          onRetry={() => {
            setResultAttempt(null);
            setAnswers({});
            resumedRef.current = false;
            autoSubmitFiredRef.current = false;
          }}
        />
      </ViewerShell>
    );
  }

  // ── Main quiz view ──────────────────────────────────────────
  return (
    <ViewerShell
      courseTitle={course?.title ?? ""}
      breadcrumb={current?.sectionTitle}
      exitHref={`/student/courses/${courseId}`}
      sidebar={sidebar}
      topRight={
        activeAttempt && quiz.time_limit_minutes ? (
          <QuizTimer
            startedAt={activeAttempt.started_at}
            timeLimitMinutes={quiz.time_limit_minutes}
            onExpire={handleSubmit}
          />
        ) : undefined
      }
      bottomBar={
        activeAttempt && questionBlocks.length > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              {answeredCount} / {questionBlocks.length} question
              {questionBlocks.length !== 1 ? "s" : ""} repondue
              {answeredCount !== 1 ? "s" : ""}
            </span>
            <Button
              disabled={isSubmitting}
              onClick={() => setConfirmSubmit(true)}
            >
              {isSubmitting ? "Envoi..." : "Soumettre le quiz"}
            </Button>
          </>
        ) : undefined
      }
    >
      {/* Header */}
      <div className="space-y-3 pb-6">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            Quiz
          </Badge>
          {quiz.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {quiz.time_limit_minutes} min
            </span>
          )}
          <span>
            {questionBlocks.length} question
            {questionBlocks.length !== 1 ? "s" : ""}
          </span>
          <span>Note sur 100</span>
          {attempts && attempts.length > 0 && (
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              {attempts.length} tentative
              {attempts.length !== 1 ? "s" : ""} precedente
              {attempts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="text-sm text-muted-foreground">{quiz.description}</p>
        )}
      </div>

      {/* Previous attempts — compact collapsible */}
      {attempts && attempts.length > 0 && (
        <PreviousAttempts attempts={attempts} />
      )}

      <Separator className="mb-6" />

      {/* Pre-start gate — show quiz intro + confirmation before creating the attempt */}
      {!activeAttempt ? (
        sortedBlocks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ce quiz ne contient aucun bloc.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg text-amber-950">
                Pret a commencer ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-950">
                Vous etes sur le point de commencer <strong>{quiz.title}</strong>.
                Une fois demarre, le compte a rebours commence et le quiz doit
                etre termine avant la fin du temps imparti.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Questions
                  </div>
                  <div className="mt-1 text-lg font-semibold text-amber-950">
                    {questionBlocks.length}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Duree
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-lg font-semibold text-amber-950">
                    <Clock className="h-4 w-4" />
                    {quiz.time_limit_minutes
                      ? `${quiz.time_limit_minutes} min`
                      : "Illimitee"}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Note
                  </div>
                  <div className="mt-1 text-lg font-semibold text-amber-950">
                    sur 100
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tentatives
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-lg font-semibold text-amber-950">
                    <RotateCcw className="h-4 w-4" />
                    {quiz.max_attempts == null
                      ? "Illimitees"
                      : `${Math.max(quiz.max_attempts - (attempts?.length ?? 0), 0)} / ${quiz.max_attempts}`}
                  </div>
                </div>
              </div>

              {quiz.time_limit_minutes && (
                <p className="text-xs text-muted-foreground">
                  Lorsque le temps imparti est ecoule, le quiz sera
                  automatiquement soumis avec les reponses enregistrees.
                </p>
              )}

              {(() => {
                const used = attempts?.length ?? 0;
                const cap = quiz.max_attempts;
                const exhausted = cap != null && used >= cap;
                const remaining = cap != null ? Math.max(cap - used, 0) : null;

                return (
                  <>
                    {cap != null && (
                      <p className="text-xs text-muted-foreground">
                        {exhausted
                          ? `Tentatives epuisees (${used} / ${cap}).`
                          : cap === 1
                            ? "Une seule tentative autorisee."
                            : `Tentative ${used + 1} sur ${cap} (${remaining} restante${remaining === 1 ? "" : "s"}).`}
                      </p>
                    )}
                    <Button
                      size="lg"
                      disabled={isStarting || exhausted}
                      onClick={() => {
                        if (cap != null) {
                          setConfirmStart(true);
                        } else {
                          handleStart();
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      {exhausted
                        ? "Tentatives epuisees"
                        : isStarting
                          ? "Demarrage..."
                          : "Commencer le quiz"}
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )
      ) : (
        /* Blocks — rendered only after the attempt is started */
        <div className="space-y-4">
          {(() => {
            let questionIndex = 0;
            return sortedBlocks.map((block) => {
              const isQuestion =
                block.type === "mcq" ||
                block.type === "fill_blank" ||
                block.type === "free_text" ||
                block.type === "voice";
              const currentIndex = isQuestion ? questionIndex++ : -1;
              return (
                <StudentBlockView
                  key={block.id}
                  block={block}
                  questionIndex={currentIndex}
                  answer={answers[block.id]}
                  onAnswerChange={(patch) => handleAnswerChange(block.id, patch)}
                  courseId={courseId}
                  quizId={quizId}
                  attemptId={activeAttempt.id}
                />
              );
            });
          })()}
        </div>
      )}

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Soumettre le quiz ?"
        description={
          answeredCount < questionBlocks.length
            ? `Vous n'avez repondu qu'a ${answeredCount} question${answeredCount !== 1 ? "s" : ""} sur ${questionBlocks.length}. Voulez-vous vraiment soumettre ?`
            : "Vos reponses seront enregistrees et notees."
        }
        confirmLabel="Soumettre"
        cancelLabel="Continuer le quiz"
        isPending={isSubmitting}
        onConfirm={handleSubmit}
      />

      {quiz && quiz.max_attempts != null && (() => {
        const used = attempts?.length ?? 0;
        const cap = quiz.max_attempts;
        const remaining = Math.max(cap - used, 0);
        return (
          <ConfirmDialog
            open={confirmStart}
            onOpenChange={setConfirmStart}
            title={cap === 1 ? "Une seule tentative" : "Commencer le quiz ?"}
            description={
              cap === 1
                ? "Vous n'avez qu'une seule tentative. Une fois commencé, fermer le navigateur sans soumettre comptera comme votre tentative. Êtes-vous prêt(e) ?"
                : `Ceci utilisera 1 de vos ${remaining} tentative${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}. Une tentative non terminée compte aussi. Continuer ?`
            }
            confirmLabel="Commencer"
            cancelLabel="Annuler"
            isPending={isStarting}
            onConfirm={handleStart}
          />
        );
      })()}
    </ViewerShell>
  );
}

// ── Previous attempts (compact collapsible) ───────────────────────────

function PreviousAttempts({ attempts }: { attempts: StudentAttempt[] }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const submitted = attempts.filter((a) => a.submitted_at);
  const scores = submitted
    .map((a) => a.final_score)
    .filter((s): s is number => s !== null);
  const best = scores.length > 0 ? Math.max(...scores) : null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
      >
        <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-muted-foreground">
          {attempts.length} tentative{attempts.length !== 1 ? "s" : ""} precedente{attempts.length !== 1 ? "s" : ""}
          {best !== null && (
            <span className="ml-1.5 font-medium text-foreground">
              · meilleur score {best}%
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-1.5 space-y-1">
          {attempts.slice(0, 8).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs"
            >
              <span className="text-muted-foreground">
                {a.submitted_at
                  ? format(new Date(a.submitted_at), "d MMM yyyy 'a' HH:mm", { locale: fr })
                  : "En cours"}
              </span>
              <div className="flex items-center gap-2">
                {(a.status === "submitted" || a.status === "pending_review") && (
                  <span className="text-muted-foreground">En attente</span>
                )}
                <span className="font-medium tabular-nums">
                  {a.final_score !== null ? `${a.final_score}%` : "-"}
                </span>
              </div>
            </div>
          ))}
          {attempts.length > 8 && (
            <p className="px-3 py-1 text-xs text-muted-foreground">
              +{attempts.length - 8} autre{attempts.length - 8 !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Result view ─────────────────────────────────────────────────────

function QuizResultView({
  quizTitle,
  finalScore,
  status,
  courseId,
  nextItem,
  nextHref,
  onRetry,
}: {
  quizTitle: string;
  finalScore: number | null;
  status: string;
  courseId: string;
  nextItem: FlatItem | null;
  nextHref: string | null;
  onRetry: () => void;
}): React.JSX.Element {
  const percentage = finalScore !== null ? Math.round(finalScore) : null;

  const tone =
    percentage === null
      ? "text-muted-foreground"
      : percentage >= 70
      ? "text-emerald-600"
      : percentage >= 50
      ? "text-amber-600"
      : "text-rose-600";

  const isPending = status === "pending_review" || status === "submitted";

  return (
    <div className="max-w-2xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Quiz soumis
            </p>
            <h2 className="text-2xl font-bold text-amber-950">{quizTitle}</h2>
          </div>
          {percentage !== null && !isPending ? (
            <p className={`text-5xl font-bold ${tone}`}>{percentage}%</p>
          ) : (
            <p className="text-sm text-muted-foreground">Score en attente</p>
          )}
          {isPending && (
            <Badge variant="outline">
              Certaines questions en attente de correction manuelle
            </Badge>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={onRetry}>
              Refaire le quiz
            </Button>
            {nextItem && nextHref ? (
              <Link href={nextHref}>
                <Button>
                  {nextItem.kind === "quiz" ? "Quiz suivant" : "Lecon suivante"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href={`/student/courses/${courseId}`}>
                <Button>Retour au cours</Button>
              </Link>
            )}
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
  courseId,
  quizId,
  attemptId,
}: {
  block: QuizBlock;
  questionIndex: number;
  answer: AnswerState | undefined;
  onAnswerChange: (patch: AnswerState) => void;
  courseId: string;
  quizId: string;
  attemptId: string;
}): React.JSX.Element {
  const type = block.type as BlockType;
  const content = block.content as Record<string, unknown>;
  const isQuestion =
    type === "mcq" || type === "fill_blank" || type === "free_text" || type === "voice";

  if (type === "section") {
    const title = (content.title as string) || "";
    const description = content.description as string | undefined;
    return (
      <div className="pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        {description && (
          <p className="mt-1 text-center text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      {isQuestion && (
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Question {questionIndex + 1}
          </span>
          {block.weight !== null && (
            <span className="text-xs text-muted-foreground">
              Poids: {block.weight}
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
            selectedIds={answer?.selected_option_ids}
            onSelect={(id) => onAnswerChange({ selected_option_id: id })}
            onToggle={(ids) => onAnswerChange({ selected_option_ids: ids })}
          />
        )}
        {type === "fill_blank" && (
          <FillBlankView
            content={content}
            selectedId={answer?.selected_option_id}
            onSelect={(id) => onAnswerChange({ selected_option_id: id })}
          />
        )}
        {type === "free_text" && (
          <FreeTextView
            content={content}
            value={answer?.text_answer ?? ""}
            onChange={(text) => onAnswerChange({ text_answer: text })}
          />
        )}
        {type === "voice" && (
          <VoiceView
            content={content}
            courseId={courseId}
            quizId={quizId}
            attemptId={attemptId}
            blockId={block.id}
            audioUrl={answer?.audio_url}
            onRecorded={(audio_url, duration_seconds) =>
              onAnswerChange({ audio_url, duration_seconds })
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function VoiceView({
  content,
  courseId,
  quizId,
  attemptId,
  blockId,
  audioUrl,
  onRecorded,
}: {
  content: Record<string, unknown>;
  courseId: string;
  quizId: string;
  attemptId: string;
  blockId: string;
  audioUrl: string | undefined;
  onRecorded: (path: string, durationSeconds: number) => void;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  const maxDuration = (content.max_duration_seconds as number) ?? 120;
  return (
    <div className="space-y-3">
      {prompt && <p className="text-sm font-medium text-amber-950">{prompt}</p>}
      <AudioRecorder
        maxDurationSeconds={maxDuration}
        courseId={courseId}
        quizId={quizId}
        attemptId={attemptId}
        blockId={blockId}
        currentPath={audioUrl || undefined}
        onRecorded={onRecorded}
      />
    </div>
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

function McqView({
  content,
  selectedId,
  selectedIds,
  onSelect,
  onToggle,
}: {
  content: Record<string, unknown>;
  selectedId: string | undefined;
  selectedIds: string[] | undefined;
  onSelect: (id: string) => void;
  onToggle: (ids: string[]) => void;
}): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  const allowMultiple = content.allow_multiple === true;
  // Strip is_correct before rendering to student — never leak correct answer
  const options = ((content.options as { id: string; label: string }[]) || []).map((o) => ({
    id: o.id,
    label: o.label,
  }));

  const currentSet = new Set(selectedIds ?? []);

  return (
    <div className="space-y-3">
      {prompt && <p className="text-sm font-medium text-amber-950">{prompt}</p>}
      {allowMultiple && (
        <p className="text-xs text-muted-foreground">
          Plusieurs reponses possibles
        </p>
      )}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = allowMultiple
            ? currentSet.has(opt.id)
            : selectedId === opt.id;
          const handleClick = (): void => {
            if (allowMultiple) {
              const next = new Set(currentSet);
              if (next.has(opt.id)) next.delete(opt.id);
              else next.add(opt.id);
              onToggle([...next]);
            } else {
              onSelect(opt.id);
            }
          };
          return (
            <button
              key={opt.id}
              type="button"
              onClick={handleClick}
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
  selectedId,
  onSelect,
}: {
  content: Record<string, unknown>;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const sentence = (content.sentence as string) || "";
  const options =
    (content.options as { id: string; label: string }[] | undefined) ?? [];
  const parts = sentence.split("___");
  const selectedOption = options.find((o) => o.id === selectedId);

  return (
    <div className="space-y-3">
      {/* Sentence with blank shown as the selected word or an underline */}
      <p className="text-sm leading-relaxed">
        {parts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <span
                className={`mx-1 inline-block min-w-[4rem] border-b-2 px-1 text-center font-medium transition-colors ${
                  selectedOption
                    ? "border-primary text-primary"
                    : "border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                {selectedOption ? selectedOption.label : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              </span>
            )}
          </span>
        ))}
      </p>

      {/* Word chips */}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id === selectedId ? "" : opt.id)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              opt.id === selectedId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50 hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
        placeholder="Ecrivez votre reponse ici..."
        className="resize-none"
      />
      {minWords && (
        <p className="text-xs text-muted-foreground">
          {wordCount} / {minWords} mots minimum
          {wordCount < minWords && (
            <XCircle className="ml-1 inline h-3 w-3 text-rose-500" />
          )}
        </p>
      )}
    </div>
  );
}
