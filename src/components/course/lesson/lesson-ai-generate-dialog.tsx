"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateAILesson } from "@/lib/hooks/useAILesson";
import type { CEFRLevel } from "@/lib/types";

type Depth = "quick" | "detailed";
type LessonType = "grammar" | "vocabulary" | "resource";

interface LessonAIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  lessonType: LessonType;
  courseLevel: CEFRLevel;
  hasExistingContent: boolean;
  onGenerated: (newContent: string) => void;
}

interface FormState {
  scope: string;
  depth: Depth;
  includeExercises: boolean;
  includeFrenchSupport: boolean;
  theme: string;
  extraNotes: string;
}

const defaultForm = (level: CEFRLevel): FormState => ({
  scope: "",
  depth: "quick",
  includeExercises: true,
  // French support is the recommended default for A1/A2.
  includeFrenchSupport: level === "A1" || level === "A2",
  theme: "",
  extraNotes: "",
});

const SCOPE_PLACEHOLDER: Record<LessonType, string> = {
  grammar:
    "ex: present simple, affirmative + negative + questions",
  vocabulary:
    "ex: 12 words about travel and transportation",
  resource:
    "ex: a short reading on Moroccan tea culture",
};

export function LessonAIGenerateDialog({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  lessonType,
  courseLevel,
  hasExistingContent,
  onGenerated,
}: LessonAIGenerateDialogProps): React.JSX.Element {
  const [form, setForm] = useState<FormState>(() => defaultForm(courseLevel));
  const { mutate: generate, isPending } = useGenerateAILesson();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = (): void => {
    const scope = form.scope.trim();
    if (!scope || isPending) return;
    generate(
      {
        lessonId,
        scope,
        depth: form.depth,
        includeExercises: form.includeExercises,
        includeFrenchSupport: form.includeFrenchSupport,
        theme: form.theme.trim() || undefined,
        extraNotes: form.extraNotes.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          onGenerated(res.newContent);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (isPending ? null : onOpenChange(o))}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Générer la leçon avec l&apos;IA
          </DialogTitle>
          <DialogDescription>
            Quelques questions pour produire une leçon adaptée. Vous pourrez
            ensuite l&apos;éditer librement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasExistingContent ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Cette leçon contient déjà du contenu. La génération le
              remplacera entièrement.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Niveau:</span>{" "}
              {courseLevel}
            </div>
            <div>
              <span className="font-medium text-foreground">Type:</span>{" "}
              {lessonType}
            </div>
            <div className="col-span-2 truncate">
              <span className="font-medium text-foreground">Titre:</span>{" "}
              {lessonTitle}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Que doit couvrir cette leçon ?{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={form.scope}
              onChange={(e) => update("scope", e.target.value)}
              placeholder={SCOPE_PLACEHOLDER[lessonType]}
              rows={2}
              disabled={isPending}
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Profondeur</Label>
              <Select
                value={form.depth}
                onValueChange={(v) => update("depth", v as Depth)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Rapide (1 page)</SelectItem>
                  <SelectItem value="detailed">Détaillée (2-3 pages)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Thème (optionnel)</Label>
              <Input
                value={form.theme}
                onChange={(e) => update("theme", e.target.value)}
                placeholder="ex: travail, voyage, famille"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeExercises}
                onChange={(e) => update("includeExercises", e.target.checked)}
                disabled={isPending}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Inclure des exercices</span>
                <span className="block text-xs text-muted-foreground">
                  Section &laquo; Quick check &raquo; à la fin (2-4 questions)
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeFrenchSupport}
                onChange={(e) =>
                  update("includeFrenchSupport", e.target.checked)
                }
                disabled={isPending}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">
                  Support en français
                </span>
                <span className="block text-xs text-muted-foreground">
                  Traductions et notes contrastives FR/EN (recommandé pour
                  A1-A2)
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes pour l&apos;IA (optionnel)</Label>
            <Textarea
              value={form.extraNotes}
              onChange={(e) => update("extraNotes", e.target.value)}
              placeholder="Précisions, points à éviter, exigences particulières…"
              rows={2}
              disabled={isPending}
              className="resize-none text-sm"
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
            disabled={!form.scope.trim() || isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer la leçon
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
