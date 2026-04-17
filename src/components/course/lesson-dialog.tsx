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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createLessonSchema,
  type CreateLessonInput,
} from "@/lib/schemas/course.schema";
import { useCreateLesson } from "@/lib/hooks/useLessons";

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sectionId: string;
  nextOrder: number;
}

const EMPTY_VALUES: CreateLessonInput = {
  title: "",
  content: "",
  type: "grammar",
};

export function LessonDialog({
  open,
  onOpenChange,
  courseId,
  sectionId,
  nextOrder,
}: LessonDialogProps): React.JSX.Element {
  const router = useRouter();
  const { mutate: createLesson, isPending } = useCreateLesson(courseId);

  const form = useForm<CreateLessonInput>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) form.reset(EMPTY_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const type = form.watch("type");

  const onSubmit = (data: CreateLessonInput): void => {
    createLesson(
      {
        ...data,
        section_id: sectionId,
        order: nextOrder,
      },
      {
        onSuccess: (lesson) => {
          onOpenChange(false);
          router.push(
            `/instructor/courses/${courseId}/lessons/${lesson.id}/edit`,
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle lecon</DialogTitle>
          <DialogDescription>
            Donnez un titre a votre lecon. Vous pourrez rediger le contenu sur
            la page suivante.
          </DialogDescription>
        </DialogHeader>

        <form
          id="lesson-create-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Titre</Label>
            <Input
              id="lesson-title"
              autoFocus
              placeholder="ex : Present Simple"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type ?? ""}
              onValueChange={(v) =>
                form.setValue("type", v as CreateLessonInput["type"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grammar">Grammaire</SelectItem>
                <SelectItem value="vocabulary">Vocabulaire</SelectItem>
                <SelectItem value="resource">Ressource</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="submit" form="lesson-create-form" disabled={isPending}>
            {isPending ? "Creation..." : "Continuer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
