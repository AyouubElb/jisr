"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentEngagement } from "@/lib/hooks/useEngagement";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { ArrowLeft, BookOpen, Calendar, ClipboardCheck, Circle } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import type { CEFRLevel } from "@/lib/types";

function activityTone(lastActiveAt: string | null): {
  label: string;
  color: string;
  dot: string;
} {
  if (!lastActiveAt) {
    return { label: "Jamais actif", color: "text-muted-foreground", dot: "text-muted-foreground/40" };
  }
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  const rel = formatDistanceToNowStrict(new Date(lastActiveAt), { locale: fr, addSuffix: true });
  if (days <= 3) return { label: rel, color: "text-emerald-700", dot: "text-emerald-500 fill-emerald-500" };
  if (days <= 14) return { label: rel, color: "text-amber-700", dot: "text-amber-500 fill-amber-500" };
  return { label: rel, color: "text-rose-700", dot: "text-rose-500 fill-rose-500" };
}

export default function InstructorStudentDetailPage(): React.JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;
  const courseId = searchParams.get("courseId") ?? "";

  const { data, isLoading } = useStudentEngagement(studentId, courseId);

  if (!courseId) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg text-muted-foreground">Parametre courseId manquant</p>
        <Link href="/instructor/students">
          <Button variant="outline">Retour aux etudiants</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const tone = activityTone(data.enrollment?.lastActiveAt ?? null);
  const completedCount = data.completedLessonIds.length;
  const completionPct = data.totals.lessonCount
    ? Math.round((completedCount / data.totals.lessonCount) * 100)
    : 0;
  const quizAttempted = new Set(data.attempts.map((a) => a.quizId)).size;
  const quizParticipationPct = data.totals.quizCount
    ? Math.round((quizAttempted / data.totals.quizCount) * 100)
    : 0;
  const gradedAttempts = data.attempts.filter(
    (a) => a.score !== null && a.maxScore !== null && a.maxScore > 0,
  );
  const avgPct = gradedAttempts.length
    ? Math.round(
        (gradedAttempts.reduce((s, a) => s + (a.score ?? 0) / (a.maxScore ?? 1), 0) /
          gradedAttempts.length) *
          100,
      )
    : null;
  const attendedCount = data.attendance.filter((a) => a.attended).length;
  const attendancePct = data.attendance.length
    ? Math.round((attendedCount / data.attendance.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/instructor/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
            {data.student.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{data.student.fullName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge className={LEVEL_BADGE_COLORS[data.course.level as CEFRLevel]}>
                {data.course.level}
              </Badge>
              <Link href={`/instructor/courses/${data.course.id}`} className="hover:underline">
                {data.course.title}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Activity pill */}
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${tone.color}`}>
        <Circle className={`h-2.5 w-2.5 ${tone.dot}`} strokeWidth={0} />
        <span>Dernierement actif {tone.label}</span>
        {data.enrollment?.enrolledAt && (
          <span className="text-muted-foreground">
            · inscrit {format(new Date(data.enrollment.enrolledAt), "d MMM yyyy", { locale: fr })}
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Lecons terminees"
          value={`${completedCount} / ${data.totals.lessonCount}`}
          pct={completionPct}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <MetricCard
          label="Quiz participes"
          value={`${quizAttempted} / ${data.totals.quizCount}`}
          pct={quizParticipationPct}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Score moyen"
          value={avgPct !== null ? `${avgPct}%` : "—"}
          pct={avgPct}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Presence"
          value={
            attendancePct !== null ? `${attendedCount} / ${data.attendance.length}` : "—"
          }
          pct={attendancePct}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Quiz attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tentatives de quiz</CardTitle>
        </CardHeader>
        <CardContent>
          {data.attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tentative pour le moment</p>
          ) : (
            <div className="divide-y">
              {data.attempts.map((a) => {
                const pct =
                  a.score !== null && a.maxScore !== null && a.maxScore > 0
                    ? Math.round((a.score / a.maxScore) * 100)
                    : null;
                const tonePct =
                  pct === null
                    ? "text-muted-foreground"
                    : pct >= 70
                      ? "text-emerald-700"
                      : pct >= 50
                        ? "text-amber-700"
                        : "text-rose-700";
                return (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.quizTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.submittedAt
                          ? format(new Date(a.submittedAt), "d MMM yyyy 'a' HH:mm", { locale: fr })
                          : "En cours"}
                        {" · "}
                        {a.status === "graded"
                          ? "Note"
                          : a.status === "submitted"
                            ? "En attente de correction"
                            : "En cours"}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold ${tonePct}`}>
                      {pct !== null ? `${pct}%` : "—"}
                      {a.score !== null && a.maxScore !== null && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({a.score}/{a.maxScore})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session attendance history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presence aux sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session marquee</p>
          ) : (
            <div className="divide-y">
              {data.attendance
                .slice()
                .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1))
                .map((row) => (
                  <div key={row.sessionId} className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.sessionTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.scheduledAt
                          ? format(new Date(row.scheduledAt), "d MMM yyyy 'a' HH:mm", { locale: fr })
                          : ""}
                      </p>
                    </div>
                    {row.attended ? (
                      <Badge className="bg-emerald-100 text-emerald-800">Present</Badge>
                    ) : (
                      <Badge variant="secondary">Absent</Badge>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  pct: number | null;
  icon: React.ReactNode;
}

function MetricCard({ label, value, pct, icon }: MetricCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {pct !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      )}
    </div>
  );
}
