"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createSectionSchema,
  type CreateSectionInput,
} from "@/lib/schemas/course.schema";
import { useCreateSection } from "@/lib/hooks/useSections";

interface SectionDialogProps {
  courseId: string;
  nextOrder: number;
  trigger: React.ReactElement;
}

export function SectionDialog({
  courseId,
  nextOrder,
  trigger,
}: SectionDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const { mutate: createSection, isPending } = useCreateSection(courseId);

  const form = useForm<CreateSectionInput>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: { title: "" },
  });

  const onSubmit = (data: CreateSectionInput): void => {
    createSection(
      { ...data, course_id: courseId, order: nextOrder },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle section</DialogTitle>
          <DialogDescription>
            Les sections organisent vos lecons et exercices
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre de la section</Label>
            <Input
              placeholder="ex : Unit 1 — Present Tenses"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Ajout en cours..." : "Ajouter la section"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
