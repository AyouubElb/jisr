"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { useMyAllAttempts } from "@/lib/hooks/useAttempts";
import type { MyAttemptSummary } from "@/lib/api/attempts.api";

const RECENT_GRADED_DAYS = 14;

function recentCutoffMs(): number {
  return Date.now() - RECENT_GRADED_DAYS * 24 * 60 * 60 * 1000;
}

export default function MyAttemptsPage(): React.JSX.Element {
  const { data: attempts, isLoading } = useMyAllAttempts();

  const { pending, recent, older } = useMemo(() => {
    if (!attempts) return { pending: [], recent: [], older: [] };

    const pending: MyAttemptSummary[] = [];
    const recent: MyAttemptSummary[] = [];
    const older: MyAttemptSummary[] = [];

    const cutoff = recentCutoffMs();

    for (const a of attempts) {
      const isPending = a.pending_count > 0 || a.final_score === null;
      if (isPending) {
        pending.push(a);
        continue;
      }
      const gradedAt = a.graded_at ? new Date(a.graded_at).getTime() : 0;
      if (gradedAt >= cutoff) recent.push(a);
      else older.push(a);
    }

    return { pending, recent, older };
  }, [attempts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          Mes notes
        </h1>
        <p className="text-muted-foreground">
          Retrouvez toutes vos tentatives et leurs resultats
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !attempts || attempts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <Section
              icon={<Clock className="h-4 w-4" />}
              title="En attente de correction"
              subtitle="Votre instructeur va evaluer ces reponses"
              attempts={pending}
            />
          )}
          {recent.length > 0 && (
            <Section
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Recemment corrige"
              subtitle={`Corrige ces ${RECENT_GRADED_DAYS} derniers jours`}
              attempts={recent}
            />
          )}
          {older.length > 0 && (
            <Section
              icon={<History className="h-4 w-4" />}
              title="Historique"
              subtitle="Tentatives plus anciennes"
              attempts={older}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  attempts,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  attempts: MyAttemptSummary[];
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          {title}
        </h2>
        <span className="text-xs">&middot; {attempts.length}</span>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <div className="space-y-2">
        {attempts.map((a) => (
          <AttemptRow key={a.attempt_id} attempt={a} />
        ))}
      </div>
    </section>
  );
}

function AttemptRow({
  attempt,
}: {
  attempt: MyAttemptSummary;
}): React.JSX.Element {
  const isPending = attempt.pending_count > 0 || attempt.final_score === null;
  const submitted = formatDistanceToNowStrict(new Date(attempt.submitted_at), {
    locale: fr,
    addSuffix: true,
  });

  return (
    <Link
      href={`/student/attempts/${attempt.attempt_id}`}
      className="block"
    >
      <Card className="gap-0! py-0! transition-colors hover:bg-muted/30">
        <CardContent className="flex items-center gap-4 px-3 py-3 md:px-4 md:py-4">
          <Badge className={LEVEL_BADGE_COLORS[attempt.course_level]}>
            {attempt.course_level}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-amber-950">
              {attempt.quiz_title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {attempt.course_title} &middot; soumis {submitted}
            </p>
          </div>

          {isPending ? (
            <div className="flex items-center gap-2 text-xs">
              {attempt.auto_score !== null && (
                <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-muted-foreground">
                  Auto {attempt.auto_score}%
                </span>
              )}
              <Badge variant="secondary" className="shrink-0">
                En attente
              </Badge>
            </div>
          ) : (
            <ScorePill score={attempt.final_score} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ScorePill({ score }: { score: number | null }): React.JSX.Element {
  if (score === null)
    return <span className="text-sm text-muted-foreground">-</span>;
  const tone =
    score >= 70
      ? "bg-emerald-100 text-emerald-900"
      : score >= 50
        ? "bg-amber-100 text-amber-900"
        : "bg-rose-100 text-rose-900";
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${tone}`}
    >
      {score}%
    </span>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Aucune tentative</p>
          <p className="text-xs text-muted-foreground">
            Vos resultats apparaitront ici des que vous aurez soumis un quiz
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
