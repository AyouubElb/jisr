"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useQuestionThread,
  useReplyToQuestion,
  useSetQuestionStatus,
} from "@/lib/hooks/useQuestions";
import {
  replyQuestionSchema,
  type ReplyQuestionInput,
} from "@/lib/schemas/question.schema";
import { CheckCircle2, RotateCcw } from "lucide-react";

interface QuestionThreadDialogProps {
  courseId: string;
  questionId: string | null;
  currentUserId: string;
  onClose: () => void;
}

export function QuestionThreadDialog({
  courseId,
  questionId,
  currentUserId,
  onClose,
}: QuestionThreadDialogProps): React.JSX.Element {
  const { data: thread, isLoading } = useQuestionThread(questionId);
  const { mutate: reply, isPending: isReplying } = useReplyToQuestion(courseId);
  const { mutate: setStatus, isPending: isTogglingStatus } =
    useSetQuestionStatus(courseId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ReplyQuestionInput>({
    resolver: zodResolver(replyQuestionSchema) as any,
    defaultValues: { body: "" },
  });

  const onSubmit = (data: ReplyQuestionInput): void => {
    if (!questionId) return;
    reply(
      {
        question_id: questionId,
        author_id: currentUserId,
        body: data.body,
      },
      { onSuccess: () => form.reset() },
    );
  };

  const isResolved = thread?.status === "resolved";

  return (
    <Dialog
      open={!!questionId}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        {isLoading || !thread ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg">{thread.title}</DialogTitle>
                  <DialogDescription>
                    {thread.student.full_name} &middot;{" "}
                    {format(new Date(thread.created_at), "d MMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </DialogDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isResolved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }
                >
                  {isResolved ? "Resolue" : "Ouverte"}
                </Badge>
              </div>
            </DialogHeader>

            <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-2">
              {/* Original question */}
              <MessageRow
                name={thread.student.full_name}
                avatarUrl={thread.student.avatar_url}
                body={thread.body}
                createdAt={thread.created_at}
                roleLabel="Eleve"
              />

              {thread.replies.map((r) => (
                <MessageRow
                  key={r.id}
                  name={r.author.full_name}
                  avatarUrl={r.author.avatar_url}
                  body={r.body}
                  createdAt={r.created_at}
                  roleLabel={
                    r.author.role === "instructor" ? "Instructeur" : "Eleve"
                  }
                  isInstructor={r.author.role === "instructor"}
                />
              ))}
            </div>

            {/* Reply form + resolve toggle */}
            <div className="space-y-3 border-t pt-4">
              {!isResolved && (
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2"
                >
                  <Textarea
                    rows={3}
                    placeholder="Votre reponse..."
                    {...form.register("body")}
                  />
                  {form.formState.errors.body && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.body.message}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isTogglingStatus}
                      onClick={() =>
                        setStatus({
                          questionId: thread.id,
                          status: "resolved",
                        })
                      }
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Marquer comme resolue
                    </Button>
                    <Button type="submit" disabled={isReplying}>
                      {isReplying ? "Envoi..." : "Envoyer"}
                    </Button>
                  </div>
                </form>
              )}

              {isResolved && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isTogglingStatus}
                  onClick={() =>
                    setStatus({ questionId: thread.id, status: "open" })
                  }
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Rouvrir la question
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MessageRow({
  name,
  avatarUrl,
  body,
  createdAt,
  roleLabel,
  isInstructor,
}: {
  name: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  roleLabel: string;
  isInstructor?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-950">{name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isInstructor
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {roleLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), "d MMM, HH:mm", { locale: fr })}
          </span>
        </div>
        <div className="mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm whitespace-pre-wrap">
          {body}
        </div>
      </div>
    </div>
  );
}
