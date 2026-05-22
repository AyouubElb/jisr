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
  theme: string;
}

const defaultForm = (): FormState => ({
  scope: "",
  depth: "quick",
  includeExercises: true,
  theme: "",
});

const SCOPE_PLACEHOLDER: Record<LessonType, string> = {
  grammar:
    "e.g. present simple, affirmative + negative + questions",
  vocabulary:
    "e.g. 12 words about travel and transportation",
  resource:
    "e.g. a short reading on Moroccan tea culture",
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
  const [form, setForm] = useState<FormState>(() => defaultForm());
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
        theme: form.theme.trim() || undefined,
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
            Generate the lesson with AI
          </DialogTitle>
          <DialogDescription>
            A few questions to produce a tailored lesson. You can edit it freely afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasExistingContent ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This lesson already has content. Generation will replace it entirely.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Level:</span>{" "}
              {courseLevel}
            </div>
            <div>
              <span className="font-medium text-foreground">Type:</span>{" "}
              {lessonType}
            </div>
            <div className="col-span-2 truncate">
              <span className="font-medium text-foreground">Title:</span>{" "}
              {lessonTitle}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              What should this lesson cover?{" "}
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
              <Label className="text-xs">Depth</Label>
              <Select
                value={form.depth}
                onValueChange={(v) => update("depth", v as Depth)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick (1 page)</SelectItem>
                  <SelectItem value="detailed">Detailed (2-3 pages)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Theme (optional)</Label>
              <Input
                value={form.theme}
                onChange={(e) => update("theme", e.target.value)}
                placeholder="e.g. work, travel, family"
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
                <span className="font-medium">Include exercises</span>
                <span className="block text-xs text-muted-foreground">
                  &ldquo;Quick check&rdquo; section at the end (2-4 questions)
                </span>
              </span>
            </label>
          </div>

        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
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
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate lesson
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
