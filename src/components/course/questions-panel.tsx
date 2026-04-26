"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MessageCircle,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCourseQuestions } from "@/lib/hooks/useQuestions";
import { useQueryClient } from "@tanstack/react-query";
import { questionKeys } from "@/lib/constants/queryKeys";
import { QuestionDialog } from "./question-dialog";
import { QuestionThreadDialog } from "./question-thread-dialog";

interface QuestionsPanelProps {
  courseId: string;
  currentUserId: string;
  role: "student" | "instructor";
}

export function QuestionsPanel({
  courseId,
  currentUserId,
  role,
}: QuestionsPanelProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: questions, isLoading } = useCourseQuestions(courseId);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  const handleRefresh = (): void => {
    queryClient.invalidateQueries({ queryKey: questionKeys.byCourse(courseId) });
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-amber-950">Questions</p>
          <p className="text-sm text-muted-foreground">
            {role === "instructor"
              ? "Questions privees posees par vos eleves"
              : "Posez une question privee a votre instructeur"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Actualiser
          </Button>
          {role === "student" && (
            <QuestionDialog
              courseId={courseId}
              studentId={currentUserId}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nouvelle question
                </Button>
              }
            />
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !questions?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-amber-950">Aucune question</p>
              <p className="text-sm text-muted-foreground">
                {role === "student"
                  ? "Posez votre premiere question a l'instructeur."
                  : "Les questions de vos eleves apparaitront ici."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => {
            const isResolved = q.status === "resolved";
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setOpenQuestionId(q.id)}
                className="flex w-full min-w-0 overflow-hidden items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40"
              >
                <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                  {q.student.avatar_url && (
                    <AvatarImage
                      src={q.student.avatar_url}
                      alt={q.student.full_name}
                    />
                  )}
                  <AvatarFallback>
                    {q.student.full_name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-amber-950">
                      {q.title}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        isResolved
                          ? "shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "shrink-0 border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {isResolved ? (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {isResolved ? "Resolue" : "Ouverte"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {q.body}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{q.student.full_name}</span>
                    <span>&middot;</span>
                    <span
                      title={format(new Date(q.last_activity_at), "PPpp", {
                        locale: fr,
                      })}
                    >
                      {formatDistanceToNowStrict(new Date(q.last_activity_at), {
                        locale: fr,
                        addSuffix: true,
                      })}
                    </span>
                    {q.reply_count > 0 && (
                      <>
                        <span>&middot;</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {q.reply_count} reponse
                          {q.reply_count !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <QuestionThreadDialog
        courseId={courseId}
        questionId={openQuestionId}
        currentUserId={currentUserId}
        onClose={() => setOpenQuestionId(null)}
      />
    </div>
  );
}
