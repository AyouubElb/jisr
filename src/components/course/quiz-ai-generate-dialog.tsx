"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  audio_passage: number;
}

const DEFAULT_MIX: Mix = { mcq: 4, fill_blank: 2, free_text: 1, audio_passage: 0 };
const DEFAULT_QUESTIONS_PER_PASSAGE = 3;
// Total counts only direct gradable questions; comprehension MCQs nested
// inside audio passages are derived (passages * questionsPerPassage).
const directTotal = (m: Mix): number => m.mcq + m.fill_blank + m.free_text;
const DEFAULT_TOTAL = directTotal(DEFAULT_MIX);

export function QuizAIGenerateDialog({
  open,
  onOpenChange,
  courseId,
  sectionId,
  lessons,
}: QuizAIGenerateDialogProps): React.JSX.Element {
  const router = useRouter();
  const { mutate: generate, isPending } = useGenerateAIQuiz(courseId, sectionId);

  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(DEFAULT_TOTAL);
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const [questionsPerPassage, setQuestionsPerPassage] = useState<number>(
    DEFAULT_QUESTIONS_PER_PASSAGE,
  );
  const [focusTopic, setFocusTopic] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedLessonIds(lessons.length === 1 ? [lessons[0].id] : []);
      setNumQuestions(DEFAULT_TOTAL);
      setMix(DEFAULT_MIX);
      setQuestionsPerPassage(DEFAULT_QUESTIONS_PER_PASSAGE);
      setFocusTopic("");
    }
  }, [open, lessons]);

  const toggleLesson = (id: string): void => {
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const mixTotal = directTotal(mix);
  const mixMatches = mixTotal === numQuestions;
  const passageQsValid =
    mix.audio_passage === 0 ||
    (questionsPerPassage >= 1 && questionsPerPassage <= 5);
  const canSubmit =
    selectedLessonIds.length > 0 &&
    mixMatches &&
    passageQsValid &&
    numQuestions >= 3 &&
    numQuestions <= 15 &&
    mix.audio_passage <= 3;

  const onSubmit = (): void => {
    if (!canSubmit) return;
    generate(
      {
        sectionId,
        lessonIds: selectedLessonIds,
        numQuestions,
        mix,
        questionsPerAudioPassage: questionsPerPassage,
        focusTopic: focusTopic.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          onOpenChange(false);
          router.push(`/instructor/courses/${courseId}/quizzes/${res.quizId}/edit`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer un quiz avec l'IA
          </DialogTitle>
          <DialogDescription>
            Choisissez les leçons sources et la répartition des questions. Le
            brouillon sera créé pour révision avant publication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Lesson picker */}
          <div className="space-y-2">
            <Label>Leçons sources</Label>
            {lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Ajoutez au moins une leçon à cette section avant de générer.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {lessons.map((l) => {
                  const checked = selectedLessonIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLesson(l.id)}
                      className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        checked
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                          checked ? "bg-primary border-primary text-white" : "border-input"
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
            )}
            <p className="text-[11px] text-muted-foreground">
              {selectedLessonIds.length} sélectionnée(s) — max 5
            </p>
          </div>

          {/* Number of questions */}
          <div className="space-y-2">
            <Label>Nombre total de questions</Label>
            <Input
              type="number"
              min={3}
              max={15}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value) || 0)}
            />
          </div>

          {/* Mix */}
          <div className="space-y-2">
            <Label>Répartition</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">QCM</p>
                <Input
                  type="number"
                  min={0}
                  value={mix.mcq}
                  onChange={(e) =>
                    setMix((m) => ({ ...m, mcq: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Texte à trous</p>
                <Input
                  type="number"
                  min={0}
                  value={mix.fill_blank}
                  onChange={(e) =>
                    setMix((m) => ({ ...m, fill_blank: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Réponse libre</p>
                <Input
                  type="number"
                  min={0}
                  value={mix.free_text}
                  onChange={(e) =>
                    setMix((m) => ({ ...m, free_text: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            {!mixMatches && (
              <p className="text-xs text-destructive">
                La somme ({mixTotal}) doit être égale au nombre total ({numQuestions}).
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Le total ne compte pas les questions de compréhension audio (générées en plus).
            </p>
          </div>

          {/* Audio passages */}
          <div className="space-y-2">
            <Label>Passages audio (compréhension orale)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nombre de passages</p>
                <Input
                  type="number"
                  min={0}
                  max={3}
                  value={mix.audio_passage}
                  onChange={(e) =>
                    setMix((m) => ({
                      ...m,
                      audio_passage: Math.max(0, Math.min(3, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Questions par passage</p>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={questionsPerPassage}
                  disabled={mix.audio_passage === 0}
                  onChange={(e) =>
                    setQuestionsPerPassage(
                      Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                    )
                  }
                />
              </div>
            </div>
            {mix.audio_passage > 0 && (
              <p className="text-[11px] text-muted-foreground">
                +{mix.audio_passage * questionsPerPassage} QCM seront générés à partir des passages audio.
              </p>
            )}
          </div>

          {/* Focus */}
          <div className="space-y-2">
            <Label>Thème prioritaire (optionnel)</Label>
            <Input
              placeholder="ex : past perfect, vocabulaire du voyage"
              maxLength={200}
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || isPending}
          >
            {isPending ? "Génération..." : "Générer le brouillon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
