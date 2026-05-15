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
          <DialogTitle>New lesson</DialogTitle>
          <DialogDescription>
            Give your lesson a title. You&apos;ll be able to write the content on the next page.
          </DialogDescription>
        </DialogHeader>

        <form
          id="lesson-create-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              autoFocus
              placeholder="e.g. Present Simple"
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
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grammar">Grammar</SelectItem>
                <SelectItem value="vocabulary">Vocabulary</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
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
            Cancel
          </Button>
          <Button type="submit" form="lesson-create-form" disabled={isPending}>
            {isPending ? "Creating..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
