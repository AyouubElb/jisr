"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Compass,
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

// Stage 1 caps — keep generation under Vercel Hobby's 60s limit.
const MAX_LESSONS = 1;
const MAX_DIRECT_QUESTIONS = 8;
const MAX_PASSAGES_PER_TYPE = 1;
const HEAVY_CONFIG_THRESHOLD = 8;

const DEFAULT_MIX: Mix = {
  mcq: 4,
  fill_blank: 2,
  free_text: 1,
  voice_response: 0,
  audio_passage: 0,
  text_passage: 0,
};
const DEFAULT_QUESTIONS_PER_PASSAGE = 3;

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
  const [questionsPerPassage, setQuestionsPerPassage] = useState<number>(
    DEFAULT_QUESTIONS_PER_PASSAGE,
  );
  const [focusTopic, setFocusTopic] = useState<string>("");

  const toggleLesson = (id: string): void => {
    setSelectedLessonIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // Stage 1: only one lesson allowed — replace any prior selection.
      if (MAX_LESSONS === 1) return [id];
      if (prev.length >= MAX_LESSONS) return prev;
      return [...prev, id];
    });
  };

  // Direct gradable count = the 4 question types. Passage parents are
  // ungraded but their derived MCQs add to the final block count.
  const directQs = directTotal(mix);
  const usesAnyPassage = mix.audio_passage + mix.text_passage > 0;
  const derivedMCQs = (mix.audio_passage + mix.text_passage) * questionsPerPassage;
  const grandTotal = directQs + derivedMCQs;

  const directInRange = directQs >= 0 && directQs <= MAX_DIRECT_QUESTIONS;
  const passageQsValid =
    !usesAnyPassage || (questionsPerPassage >= 0 && questionsPerPassage <= 5);
  // Quiz must have at least one block of any kind.
  const hasAtLeastOneBlock = grandTotal >= 1;
  const isHeavyConfig = grandTotal >= HEAVY_CONFIG_THRESHOLD || usesAnyPassage;
  const canSubmit =
    selectedLessonIds.length > 0 &&
    directInRange &&
    passageQsValid &&
    hasAtLeastOneBlock &&
    mix.audio_passage <= MAX_PASSAGES_PER_TYPE &&
    mix.text_passage <= MAX_PASSAGES_PER_TYPE &&
    !isPending;

  const onSubmit = (): void => {
    if (!canSubmit) return;
    generate(
      {
        sectionId,
        lessonIds: selectedLessonIds,
        numQuestions: directQs,
        mix,
        questionsPerPassage,
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
          Générer un quiz avec l&apos;IA
        </DialogTitle>
        <DialogDescription>
          Brouillon créé pour révision avant publication.
        </DialogDescription>
      </DialogHeader>

      {/* ── 3-COL BENTO ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* COL 1 — Leçons */}
        <Card className="lg:row-span-2">
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <SectionTitle icon={<BookOpen className="h-4 w-4" />}>
              Leçons sources
            </SectionTitle>
            {lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Ajoutez au moins une leçon à cette section avant de générer.
              </p>
            ) : (
              <>
                <div className="flex-1 space-y-1 overflow-y-auto rounded-md border p-2">
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
                  {selectedLessonIds.length} sélectionnée
                  {selectedLessonIds.length > 1 ? "s" : ""} — max {MAX_LESSONS}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* COL 2 ROW 1 — Répartition */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <SectionTitle icon={<ListChecks className="h-4 w-4" />}>
              Répartition (questions directes)
            </SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <MixField
                label="QCM"
                hint="incl. Vrai/Faux"
                value={mix.mcq}
                onChange={(v) => setMix((m) => ({ ...m, mcq: v }))}
              />
              <MixField
                label="Texte à trous"
                value={mix.fill_blank}
                onChange={(v) => setMix((m) => ({ ...m, fill_blank: v }))}
              />
              <MixField
                label="Réponse écrite"
                value={mix.free_text}
                onChange={(v) => setMix((m) => ({ ...m, free_text: v }))}
              />
              <MixField
                label="Réponse vocale"
                hint="audio enregistré"
                value={mix.voice_response}
                onChange={(v) => setMix((m) => ({ ...m, voice_response: v }))}
              />
            </div>
            {!directInRange ? (
              <p className="text-xs text-destructive">
                Le total direct doit être entre 0 et {MAX_DIRECT_QUESTIONS} (actuel : {directQs}).
              </p>
            ) : null}
            {!hasAtLeastOneBlock ? (
              <p className="text-xs text-destructive">
                Le quiz doit contenir au moins un bloc.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* COL 3 — Instructions complémentaires (full height) */}
        <Card className="lg:row-span-2">
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <SectionTitle icon={<Compass className="h-4 w-4" />}>
              Instructions complémentaires
            </SectionTitle>
            <p className="text-xs text-muted-foreground">
              Précisez le thème, contexte, contraintes (optionnel).
            </p>
            <Textarea
              placeholder="ex : 3 questions sur le past perfect dans des situations de voyage. Inclure une comparaison avec le past simple."
              maxLength={500}
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              className="min-h-[180px] flex-1 resize-none"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {focusTopic.length} / 500
            </p>
          </CardContent>
        </Card>

        {/* COL 2 ROW 2 — Passages (audio + text + Q par passage) */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <SectionTitle icon={<Layers className="h-4 w-4" />}>
              Passages de compréhension
            </SectionTitle>
            <p className="text-xs text-muted-foreground">
              Chaque passage génère plusieurs QCM en plus.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <PassageField
                label="Audio"
                max={MAX_PASSAGES_PER_TYPE}
                value={mix.audio_passage}
                onChange={(v) =>
                  setMix((m) => ({
                    ...m,
                    audio_passage: clamp(v, 0, MAX_PASSAGES_PER_TYPE),
                  }))
                }
              />
              <PassageField
                label="Texte"
                max={MAX_PASSAGES_PER_TYPE}
                value={mix.text_passage}
                onChange={(v) =>
                  setMix((m) => ({
                    ...m,
                    text_passage: clamp(v, 0, MAX_PASSAGES_PER_TYPE),
                  }))
                }
              />
              <div>
                <Label className="text-xs">QCM / passage</Label>
                <p className="text-[10px] text-muted-foreground">0–5</p>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  disabled={!usesAnyPassage}
                  value={questionsPerPassage}
                  onChange={(e) =>
                    setQuestionsPerPassage(clamp(Number(e.target.value) || 0, 0, 5))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SUMMARY BAR ────────────────────────────────────────── */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Le quiz aura
            </p>
            <p className="text-2xl font-bold leading-tight">
              {grandTotal}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                bloc{grandTotal > 1 ? "s" : ""}
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {directQs} question{directQs > 1 ? "s" : ""} directe
            {directQs > 1 ? "s" : ""}
            {derivedMCQs > 0
              ? ` + ${derivedMCQs} QCM dérivés des passages`
              : ""}
            {usesAnyPassage
              ? ` + ${mix.audio_passage + mix.text_passage} passage${
                  mix.audio_passage + mix.text_passage > 1 ? "s" : ""
                } parent${mix.audio_passage + mix.text_passage > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
      </div>

      {isHeavyConfig ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Cette configuration peut être lente (jusqu&apos;à une minute). Si la
          génération échoue, réduisez le nombre de blocs ou retirez les passages.
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
          {isPending ? "Génération..." : "Générer le brouillon"}
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
