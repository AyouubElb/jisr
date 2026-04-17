"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  createQuizSchema,
  type CreateQuizInput,
} from "@/lib/schemas/quiz.schema";
import { useCreateQuiz } from "@/lib/hooks/useQuizzes";

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sectionId: string;
  nextOrder: number;
}

const EMPTY_VALUES: CreateQuizInput = {
  title: "",
  description: "",
  time_limit_minutes: null,
  passing_score: 60,
};

export function QuizDialog({
  open,
  onOpenChange,
  courseId,
  sectionId,
  nextOrder,
}: QuizDialogProps): React.JSX.Element {
  const router = useRouter();
  const { mutate: createQuiz, isPending } = useCreateQuiz(courseId);

  const form = useForm({
    resolver: zodResolver(createQuizSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) form.reset(EMPTY_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = (values: Record<string, unknown>): void => {
    const data = values as unknown as CreateQuizInput;
    createQuiz(
      {
        ...data,
        section_id: sectionId,
        order: nextOrder,
      },
      {
        onSuccess: (quiz) => {
          onOpenChange(false);
          router.push(`/instructor/courses/${courseId}/quizzes/${quiz.id}/edit`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau quiz</DialogTitle>
          <DialogDescription>
            Donnez un titre a votre quiz. Vous pourrez ajouter les blocs et
            questions sur la page suivante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              autoFocus
              placeholder="ex : Quiz - Present Simple"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Duree limite (minutes, optionnel)</Label>
            <Input
              type="number"
              min={1}
              max={180}
              placeholder="ex : 30"
              {...form.register("time_limit_minutes", {
                setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
              })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creation..." : "Creer et continuer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
