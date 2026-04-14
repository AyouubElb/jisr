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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/course/file-upload";
import {
  createLessonSchema,
  type CreateLessonInput,
} from "@/lib/schemas/course.schema";
import { useCreateLesson, useUpdateLesson } from "@/lib/hooks/useLessons";
import { useUploadMaterial } from "@/lib/hooks/useMaterials";
import type { Lesson } from "@/lib/types";

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
} & (
  | {
      mode: "create";
      sectionId: string;
      nextOrder: number;
      lesson?: never;
    }
  | {
      mode: "edit";
      lesson: Lesson;
      sectionId?: never;
      nextOrder?: never;
    }
);

const EMPTY_VALUES: CreateLessonInput = {
  title: "",
  content: "",
  type: "grammar",
};

export function LessonDialog(props: LessonDialogProps): React.JSX.Element {
  const { open, onOpenChange, courseId, mode } = props;
  const isEdit = mode === "edit";

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { mutate: createLesson, isPending: isCreating } =
    useCreateLesson(courseId);
  const { mutate: updateLesson, isPending: isUpdating } =
    useUpdateLesson(courseId);
  const { mutate: uploadMaterial } = useUploadMaterial();

  const form = useForm<CreateLessonInput>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Reset form and pending files whenever the dialog opens with new context
  useEffect(() => {
    if (!open) return;
    setPendingFiles([]);
    if (isEdit) {
      form.reset({
        title: props.lesson.title,
        content: props.lesson.content ?? "",
        type: props.lesson.type as CreateLessonInput["type"],
      });
    } else {
      form.reset(EMPTY_VALUES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, isEdit ? props.lesson?.id : null]);

  const lessonType = form.watch("type");
  const content = form.watch("content");

  const onSubmit = (data: CreateLessonInput): void => {
    if (isEdit) {
      updateLesson(
        { id: props.lesson.id, updates: data },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createLesson(
        {
          ...data,
          section_id: props.sectionId,
          order: props.nextOrder,
        },
        {
          onSuccess: (lesson) => {
            // Upload any queued files now that we have a lesson ID
            pendingFiles.forEach((file) =>
              uploadMaterial({ file, courseId, lessonId: lesson.id }),
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
            {isEdit ? "Modifier la lecon" : "Nouvelle lecon"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez a jour le titre, le type et le contenu"
              : "Renseignez le titre, le type et le contenu de la lecon"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
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
              value={lessonType ?? ""}
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

          <div className="space-y-2">
            <Label>Contenu</Label>
            <RichTextEditor
              content={content}
              onChange={(html) =>
                form.setValue("content", html, { shouldDirty: true })
              }
              placeholder="Ecrivez le contenu de la lecon ici..."
            />
          </div>

          <div className="space-y-2">
            <Label>Documents</Label>
            {isEdit ? (
              <FileUpload courseId={courseId} lessonId={props.lesson.id} />
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
                  : "Ajouter la lecon"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
