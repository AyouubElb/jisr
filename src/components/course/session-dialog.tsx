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
import { Button } from "@/components/ui/button";
import {
  createSessionSchema,
  type CreateSessionInput,
} from "@/lib/schemas/session.schema";
import { useCreateSession } from "@/lib/hooks/useSessions";
import { generateJitsiUrl } from "@/lib/meetings/jitsi";
import { Link, Video } from "lucide-react";

type MeetingMode = "auto" | "custom";

interface SessionDialogProps {
  courseId: string;
  trigger: React.ReactElement;
}

export function SessionDialog({
  courseId,
  trigger,
}: SessionDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MeetingMode>("auto");
  const { mutate: createSession, isPending } = useCreateSession(courseId);

  const form = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema) as Resolver<CreateSessionInput>,
    defaultValues: {
      title: "",
      meeting_link: "",
      scheduled_at: "",
      duration_minutes: 60,
    },
  });

  const onSubmit = (data: CreateSessionInput): void => {
    if (mode === "custom") {
      try {
        new URL(data.meeting_link ?? "");
      } catch {
        form.setError("meeting_link", {
          message: "Veuillez entrer une URL valide (ex: https://zoom.us/...)",
        });
        return;
      }
    }

    const finalLink =
      mode === "auto" ? generateJitsiUrl(courseId) : data.meeting_link!;

    const { meeting_link: _omit, ...sessionData } = data;

    createSession(
      { ...sessionData, meeting_link: finalLink, course_id: courseId },
      {
        onSuccess: () => {
          form.reset();
          setMode("auto");
          setOpen(false);
        },
      },
    );
  };

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) {
      form.reset();
      setMode("auto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle session</DialogTitle>
          <DialogDescription>Planifiez une session en direct</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
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

          {/* Meeting mode picker */}
          <div className="space-y-2">
            <Label>Comment se connecter à cette session ?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("auto")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  mode === "auto"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-xs font-semibold text-amber-950">
                    Lien automatique
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Créé pour vous, aucun compte requis
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  mode === "custom"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-xs font-semibold text-amber-950">
                    Mon propre lien
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Zoom, Google Meet, autre...
                </p>
              </button>
            </div>
          </div>

          {/* Custom link input — only shown when mode is custom */}
          {mode === "custom" && (
            <div className="space-y-2">
              <Label>Lien de réunion</Label>
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
          )}

          {/* Date + duration */}
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
              <Label>Durée (min)</Label>
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
