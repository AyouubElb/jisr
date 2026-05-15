"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createQuestionSchema,
  type CreateQuestionInput,
} from "@/lib/schemas/question.schema";
import { useCreateQuestion } from "@/lib/hooks/useQuestions";

interface QuestionDialogProps {
  courseId: string;
  studentId: string;
  trigger: React.ReactElement;
}

export function QuestionDialog({
  courseId,
  studentId,
  trigger,
}: QuestionDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const { mutate: createQuestion, isPending } = useCreateQuestion(courseId);

  const form = useForm<CreateQuestionInput>({
    resolver: zodResolver(createQuestionSchema) as Resolver<CreateQuestionInput>,
    defaultValues: {
      title: "",
      body: "",
    },
  });

  const onSubmit = (data: CreateQuestionInput): void => {
    createQuestion(
      {
        course_id: courseId,
        student_id: studentId,
        title: data.title,
        body: data.body,
      },
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
          <DialogTitle>Poser une question</DialogTitle>
          <DialogDescription>
            Votre question est privee. Seul votre instructeur la verra.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Sujet</Label>
            <Input
              placeholder="ex : Difference entre 'since' et 'for'"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Votre question</Label>
            <Textarea
              rows={6}
              placeholder="Decrivez votre question en detail..."
              {...form.register("body")}
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Envoi..." : "Envoyer la question"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
