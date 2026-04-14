"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/course/file-upload";
import {
  createExerciseSchema,
  type CreateExerciseInput,
} from "@/lib/schemas/course.schema";
import {
  useCreateExercise,
  useUpdateExercise,
} from "@/lib/hooks/useExercises";
import { useUploadMaterial } from "@/lib/hooks/useMaterials";
import type { Exercise } from "@/lib/types";

type ExerciseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
} & (
  | {
      mode: "create";
      sectionId: string;
      nextOrder: number;
      exercise?: never;
    }
  | {
      mode: "edit";
      exercise: Exercise;
      sectionId?: never;
      nextOrder?: never;
    }
);

const EMPTY_VALUES: CreateExerciseInput = {
  title: "",
  content: "",
};

export function ExerciseDialog(props: ExerciseDialogProps): React.JSX.Element {
  const { open, onOpenChange, courseId, mode } = props;
  const isEdit = mode === "edit";

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { mutate: createExercise, isPending: isCreating } =
    useCreateExercise(courseId);
  const { mutate: updateExercise, isPending: isUpdating } =
    useUpdateExercise(courseId);
  const { mutate: uploadMaterial } = useUploadMaterial();

  const form = useForm<CreateExerciseInput>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setPendingFiles([]);
    if (isEdit) {
      form.reset({
        title: props.exercise.title,
        content: props.exercise.content ?? "",
      });
    } else {
      form.reset(EMPTY_VALUES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, isEdit ? props.exercise?.id : null]);

  const content = form.watch("content");

  const onSubmit = (data: CreateExerciseInput): void => {
    if (isEdit) {
      updateExercise(
        { id: props.exercise.id, updates: data },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createExercise(
        {
          ...data,
          section_id: props.sectionId,
          order: props.nextOrder,
        },
        {
          onSuccess: (exercise) => {
            // Upload any queued files now that we have an exercise ID
            pendingFiles.forEach((file) =>
              uploadMaterial({ file, courseId, exerciseId: exercise.id }),
            );
            onOpenChange(false);
          },
        },
      );
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'exercice" : "Nouvel exercice"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez a jour le titre et le contenu"
              : "Renseignez le titre et le contenu de l'exercice"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              placeholder="ex : Fill in the blanks"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Contenu</Label>
            <RichTextEditor
              content={content}
              onChange={(html) =>
                form.setValue("content", html, { shouldDirty: true })
              }
              placeholder="Ecrivez le contenu de l'exercice ici..."
            />
          </div>

          <div className="space-y-2">
            <Label>Documents</Label>
            {isEdit ? (
              <FileUpload courseId={courseId} exerciseId={props.exercise.id} />
            ) : (
              <FileUpload
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Enregistrement..."
                  : "Ajout en cours..."
                : isEdit
                  ? "Enregistrer"
                  : "Ajouter l'exercice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
