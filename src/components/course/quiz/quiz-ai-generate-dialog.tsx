"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Compass,
  Headphones,
  Layers,
  ListChecks,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGenerateAIQuiz } from "@/lib/hooks/useAIQuiz";
import {
  QUIZ_GEN_MAX_LESSONS,
  QUIZ_GEN_MAX_DIRECT_QUESTIONS,
  QUIZ_GEN_MAX_PASSAGES_PER_TYPE,
} from "@/lib/ai/constants";
import type { Lesson } from "@/lib/types";

interface QuizAIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sectionId: string;
  lessons: Pick<Lesson, "id" | "title" | "type">[];
}

interface Mix {
  mcq: number;
  fill_blank: number;
  free_text: number;
  voice_response: number;
  audio_passage: number;
  text_passage: number;
}

interface PassageQuestionMix {
  mcq: number;
  fill_blank: number;
}

interface PassageQs {
  text: PassageQuestionMix;
  audio: PassageQuestionMix;
}

const HEAVY_CONFIG_THRESHOLD = 8;

const DEFAULT_PASSAGE_QS: PassageQuestionMix = { mcq: 2, fill_blank: 1 };

const DEFAULT_MIX: Mix = {
  mcq: 4,
  fill_blank: 2,
  free_text: 1,
  voice_response: 0,
  audio_passage: 0,
  text_passage: 0,
};

const directTotal = (m: Mix): number =>
  m.mcq + m.fill_blank + m.free_text + m.voice_response;

export function QuizAIGenerateDialog({
  open,
  onOpenChange,
  courseId,
  sectionId,
  lessons,
}: QuizAIGenerateDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <QuizAIGenerateDialogBody
          courseId={courseId}
          sectionId={sectionId}
          lessons={lessons}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

interface QuizAIGenerateDialogBodyProps {
  courseId: string;
  sectionId: string;
  lessons: Pick<Lesson, "id" | "title" | "type">[];
  onClose: () => void;
}

function QuizAIGenerateDialogBody({
  courseId,
  sectionId,
  lessons,
  onClose,
}: QuizAIGenerateDialogBodyProps): React.JSX.Element {
  const router = useRouter();
  const { mutate: generate, isPending } = useGenerateAIQuiz(courseId, sectionId);

  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(() =>
    lessons.length === 1 ? [lessons[0].id] : [],
  );
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const [passageQs, setPassageQs] = useState<PassageQs>({
    text: { ...DEFAULT_PASSAGE_QS },
    audio: { ...DEFAULT_PASSAGE_QS },
  });
  const [focusTopic, setFocusTopic] = useState<string>("");

  const toggleLesson = (id: string): void => {
    setSelectedLessonIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // Stage 1: only one lesson allowed — replace any prior selection.
      if (QUIZ_GEN_MAX_LESSONS === 1) return [id];
      if (prev.length >= QUIZ_GEN_MAX_LESSONS) return prev;
      return [...prev, id];
    });
  };

  // Direct gradable count = the 4 question types. Passage parents are
  // ungraded but their derived MCQs add to the final block count.
  const directQs = directTotal(mix);
  const derivedMCQs =
    mix.text_passage * (passageQs.text.mcq + passageQs.text.fill_blank) +
    mix.audio_passage * (passageQs.audio.mcq + passageQs.audio.fill_blank);
  const grandTotal = directQs + derivedMCQs;
  const usesAnyPassage = mix.audio_passage + mix.text_passage > 0;

  const directInRange = directQs >= 0 && directQs <= QUIZ_GEN_MAX_DIRECT_QUESTIONS;
  const hasAtLeastOneBlock = grandTotal >= 1;
  const isHeavyConfig = grandTotal >= HEAVY_CONFIG_THRESHOLD || usesAnyPassage;
  const canSubmit =
    selectedLessonIds.length > 0 &&
    directInRange &&
    hasAtLeastOneBlock &&
    mix.audio_passage <= QUIZ_GEN_MAX_PASSAGES_PER_TYPE &&
    mix.text_passage <= QUIZ_GEN_MAX_PASSAGES_PER_TYPE &&
    !isPending;

  const onSubmit = (): void => {
    if (!canSubmit) return;
    generate(
      {
        sectionId,
        lessonIds: selectedLessonIds,
        numQuestions: directQs,
        mix,
        questionsPerTextPassage: passageQs.text,
        questionsPerAudioPassage: passageQs.audio,
        focusTopic: focusTopic.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          onClose();
          router.push(
            `/instructor/courses/${courseId}/quizzes/${res.quizId}/edit`,
          );
        },
      },
    );
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto !max-w-[calc(100%-1rem)] sm:!max-w-xl md:!max-w-3xl lg:!max-w-5xl xl:!max-w-6xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate a quiz with AI
        </DialogTitle>
        <DialogDescription>
          Draft created for review before publishing.
        </DialogDescription>
      </DialogHeader>

      {/* ── BENTO: 3 equal columns, each one card ──────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* COL 1 — Lessons */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <SectionTitle icon={<BookOpen className="h-4 w-4" />}>
              Source lessons
            </SectionTitle>
            {lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add at least one lesson to this section before generating.
              </p>
            ) : (
              <>
                <div className="space-y-1 overflow-y-auto rounded-md border p-2">
                  {lessons.map((l) => {
                    const checked = selectedLessonIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLesson(l.id)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                          checked
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input"
                          }`}
                        >
                          {checked ? "✓" : ""}
                        </span>
                        <span className="flex-1 truncate">{l.title}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {l.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {selectedLessonIds.length} selected — max {QUIZ_GEN_MAX_LESSONS}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* COL 2 — Full mix (direct questions + passages) */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            {/* Section: direct questions */}
            <div className="space-y-3">
              <SectionTitle icon={<ListChecks className="h-4 w-4" />}>
                Direct questions
              </SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <MixField
                  label="MCQ"
                  hint="incl. True/False"
                  value={mix.mcq}
                  onChange={(v) => setMix((m) => ({ ...m, mcq: v }))}
                />
                <MixField
                  label="Fill-in-the-blank"
                  value={mix.fill_blank}
                  onChange={(v) => setMix((m) => ({ ...m, fill_blank: v }))}
                />
                <MixField
                  label="Written response"
                  value={mix.free_text}
                  onChange={(v) => setMix((m) => ({ ...m, free_text: v }))}
                />
                <MixField
                  label="Voice response"
                  hint="audio recording"
                  value={mix.voice_response}
                  onChange={(v) => setMix((m) => ({ ...m, voice_response: v }))}
                />
              </div>
              {!directInRange ? (
                <p className="text-xs text-destructive">
                  Direct total must be between 0 and {QUIZ_GEN_MAX_DIRECT_QUESTIONS} (current: {directQs}).
                </p>
              ) : null}
              {!hasAtLeastOneBlock ? (
                <p className="text-xs text-destructive">
                  The quiz must contain at least one block.
                </p>
              ) : null}
            </div>

            <div className="border-t" />

            {/* Section: text passage */}
            <div className="space-y-3">
              <SectionTitle icon={<Layers className="h-4 w-4" />}>
                Text passage
              </SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                <PassageField
                  label="Passages"
                  max={QUIZ_GEN_MAX_PASSAGES_PER_TYPE}
                  value={mix.text_passage}
                  onChange={(v) =>
                    setMix((m) => ({
                      ...m,
                      text_passage: clamp(v, 0, QUIZ_GEN_MAX_PASSAGES_PER_TYPE),
                    }))
                  }
                />
                <PassageQuestionField
                  label="MCQ"
                  disabled={mix.text_passage === 0}
                  value={passageQs.text.mcq}
                  onChange={(v) =>
                    setPassageQs((q) => ({ ...q, text: { ...q.text, mcq: v } }))
                  }
                />
                <PassageQuestionField
                  label="Fill-in"
                  disabled={mix.text_passage === 0}
                  value={passageQs.text.fill_blank}
                  onChange={(v) =>
                    setPassageQs((q) => ({ ...q, text: { ...q.text, fill_blank: v } }))
                  }
                />
              </div>
            </div>

            <div className="border-t" />

            {/* Section: audio passage */}
            <div className="space-y-3">
              <SectionTitle icon={<Headphones className="h-4 w-4" />}>
                Audio passage
              </SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                <PassageField
                  label="Passages"
                  max={QUIZ_GEN_MAX_PASSAGES_PER_TYPE}
                  value={mix.audio_passage}
                  onChange={(v) =>
                    setMix((m) => ({
                      ...m,
                      audio_passage: clamp(v, 0, QUIZ_GEN_MAX_PASSAGES_PER_TYPE),
                    }))
                  }
                />
                <PassageQuestionField
                  label="MCQ"
                  disabled={mix.audio_passage === 0}
                  value={passageQs.audio.mcq}
                  onChange={(v) =>
                    setPassageQs((q) => ({ ...q, audio: { ...q.audio, mcq: v } }))
                  }
                />
                <PassageQuestionField
                  label="Fill-in"
                  disabled={mix.audio_passage === 0}
                  value={passageQs.audio.fill_blank}
                  onChange={(v) =>
                    setPassageQs((q) => ({ ...q, audio: { ...q.audio, fill_blank: v } }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COL 3 — Extra instructions */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <SectionTitle icon={<Compass className="h-4 w-4" />}>
              Extra instructions
            </SectionTitle>
            <p className="text-xs text-muted-foreground">
              Specify the theme, context, or constraints (optional).
            </p>
            <Textarea
              placeholder="e.g. 3 questions on past perfect in travel situations. Include a comparison with past simple."
              maxLength={500}
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              className="min-h-[120px] max-h-[220px] resize-none"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {focusTopic.length} / 500
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── SUMMARY BAR ────────────────────────────────────────── */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              The quiz will have
            </p>
            <p className="text-2xl font-bold leading-tight">
              {grandTotal}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                block{grandTotal > 1 ? "s" : ""}
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {directQs} direct question{directQs > 1 ? "s" : ""}
            {derivedMCQs > 0
              ? ` + ${derivedMCQs} passage question${derivedMCQs > 1 ? "s" : ""}`
              : ""}
            {usesAnyPassage
              ? ` + ${mix.audio_passage + mix.text_passage} parent passage${
                  mix.audio_passage + mix.text_passage > 1 ? "s" : ""
                }`
              : ""}
          </p>
        </div>
      </div>

      {isHeavyConfig ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This configuration may be slow (up to a minute). If generation fails,
          reduce the number of blocks or remove passages.
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
          {isPending ? "Generating..." : "Generate draft"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-primary">{icon}</span>
      {children}
    </h3>
  );
}

function MixField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">&nbsp;</p>
      )}
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1"
      />
    </div>
  );
}

function PassageField({
  label,
  max,
  value,
  onChange,
}: {
  label: string;
  max: number;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <p className="text-[10px] text-muted-foreground">0–{max}</p>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1"
      />
    </div>
  );
}

function PassageQuestionField({
  label,
  disabled,
  value,
  onChange,
}: {
  label: string;
  disabled: boolean;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <p className="text-[10px] text-muted-foreground">0–5</p>
      <Input
        type="number"
        min={0}
        max={5}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0, 0, 5))}
        className="mt-1"
      />
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
