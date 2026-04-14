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
  createSessionSchema,
  type CreateSessionInput,
} from "@/lib/schemas/session.schema";
import { useCreateSession } from "@/lib/hooks/useSessions";

interface SessionDialogProps {
  courseId: string;
  trigger: React.ReactElement;
}

export function SessionDialog({
  courseId,
  trigger,
}: SessionDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const { mutate: createSession, isPending } = useCreateSession(courseId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema) as any,
    defaultValues: {
      title: "",
      meeting_link: "",
      scheduled_at: "",
      duration_minutes: 60,
    },
  });

  const onSubmit = (data: CreateSessionInput): void => {
    createSession(
      { ...data, course_id: courseId },
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
          <DialogTitle>Nouvelle session</DialogTitle>
          <DialogDescription>Planifiez une session en direct</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              placeholder="ex : Conversation Practice"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Lien de reunion (Zoom / Google Meet)</Label>
            <Input
              placeholder="https://zoom.us/j/..."
              {...form.register("meeting_link")}
            />
            {form.formState.errors.meeting_link && (
              <p className="text-xs text-destructive">
                {form.formState.errors.meeting_link.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date et heure</Label>
              <Input
                type="datetime-local"
                {...form.register("scheduled_at")}
              />
              {form.formState.errors.scheduled_at && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.scheduled_at.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Duree (min)</Label>
              <Input
                type="number"
                min={15}
                max={180}
                {...form.register("duration_minutes")}
              />
              {form.formState.errors.duration_minutes && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.duration_minutes.message}
                </p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Planification..." : "Planifier la session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
