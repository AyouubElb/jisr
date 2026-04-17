"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useInstructorStudents, useRemoveStudent } from "@/lib/hooks/useEnrollments";
import { useStudentEngagement } from "@/lib/hooks/useEngagement";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import {
  BookOpen,
  Calendar,
  Circle,
  ClipboardCheck,
  GraduationCap,
  Users,
  UserX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import type { CEFRLevel } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────

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

function scoreTone(pct: number | null): string {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 70) return "text-emerald-700";
  if (pct >= 50) return "text-amber-700";
  return "text-rose-700";
}

// ── Main page ──────────────────────────────────────────────────────

export default function InstructorStudentsPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { data: courses, isLoading } = useInstructorStudents();
  const { mutate: removeStudent, isPending: isRemoving } = useRemoveStudent();

  const [selected, setSelected] = useState<{
    studentId: string;
    courseId: string;
    fullName: string;
  } | null>(null);

  const [confirmRemove, setConfirmRemove] = useState<{
    courseId: string;
    studentId: string;
    studentName: string;
    courseTitle: string;
  } | null>(null);

  // Hydrate selection from URL params (for links from dashboard at-risk card)
  useEffect(() => {
    const studentId = searchParams.get("student");
    const courseId = searchParams.get("courseId");
    if (studentId && courseId && courses) {
      const course = courses.find((c) => c.courseId === courseId);
      const student = course?.students.find((s) => s.studentId === studentId);
      if (student) {
        setSelected({ studentId, courseId, fullName: student.fullName });
      }
    }
  }, [searchParams, courses]);

  const totalStudents = courses
    ? new Set(courses.flatMap((c) => c.students.map((s) => s.studentId))).size
    : 0;
  const totalEnrollments = courses?.reduce((sum, c) => sum + c.students.length, 0) ?? 0;
  const coursesWithStudents = courses?.filter((c) => c.students.length > 0).length ?? 0;

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Etudiants</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble de vos etudiants par cours</p>
        </div>

        {/* ── STAT CARDS ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="col-span-2 flex flex-col justify-between rounded-xl border bg-primary p-5 text-primary-foreground">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium opacity-80">Etudiants uniques</p>
              <GraduationCap className="h-5 w-5 opacity-60" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-2 h-10 w-20 bg-primary-foreground/20" />
            ) : (
              <>
                <p className="mt-1 text-4xl font-bold tracking-tight">{totalStudents}</p>
                <p className="text-sm opacity-70">
                  {totalEnrollments} inscription{totalEnrollments !== 1 ? "s" : ""} au total
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cours actifs</p>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-12" />
            ) : (
              <p className="mt-3 text-3xl font-bold">{coursesWithStudents}</p>
            )}
          </div>
          <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cours total</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-12" />
            ) : (
              <p className="mt-3 text-3xl font-bold">{courses?.length ?? 0}</p>
            )}
          </div>
        </div>

        {/* ── BENTO: student list (left) + detail panel (right) ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Student list — 2 cols (or 3 when no panel) */}
          <div className={selected ? "lg:col-span-2" : "lg:col-span-5"}>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border bg-card p-5">
                      <Skeleton className="mb-4 h-5 w-40" />
                      <div className="space-y-3">
                        {[1, 2].map((j) => (
                          <Skeleton key={j} className="h-12 w-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : !courses?.length ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-16 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucun cours cree pour le moment</p>
                  <Link href="/instructor/courses/new">
                    <Button variant="outline" size="sm">Creer un cours</Button>
                  </Link>
                </div>
              ) : (
                courses.map((course) => (
                  <div key={course.courseId} className="rounded-xl border bg-card">
                    {/* Course header */}
                    <div className="flex items-center justify-between border-b px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Badge className={LEVEL_BADGE_COLORS[course.courseLevel as CEFRLevel]}>
                          {course.courseLevel}
                        </Badge>
                        <Link
                          href={`/instructor/courses/${course.courseId}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {course.courseTitle}
                        </Link>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {course.students.length} etudiant{course.students.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Students */}
                    {course.students.length === 0 ? (
                      <div className="flex items-center gap-2 px-5 py-5 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Aucun etudiant inscrit
                      </div>
                    ) : (
                      <div className="divide-y">
                        {course.students.map((student) => {
                          const tone = activityTone(student.lastActiveAt);
                          const isActive =
                            selected?.studentId === student.studentId &&
                            selected?.courseId === course.courseId;
                          return (
                            <div
                              key={student.enrollmentId}
                              className={`flex items-center justify-between gap-2 px-4 py-2.5 transition-colors ${
                                isActive
                                  ? "bg-primary/5 border-l-2 border-l-primary"
                                  : "hover:bg-muted/30"
                              }`}
                            >
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                onClick={() =>
                                  setSelected({
                                    studentId: student.studentId,
                                    courseId: course.courseId,
                                    fullName: student.fullName,
                                  })
                                }
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                  {student.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{student.fullName}</p>
                                  <div className={`flex items-center gap-1.5 text-xs ${tone.color}`}>
                                    <Circle className={`h-2 w-2 ${tone.dot}`} strokeWidth={0} />
                                    <span className="truncate">Actif {tone.label}</span>
                                  </div>
                                </div>
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setConfirmRemove({
                                    courseId: course.courseId,
                                    studentId: student.studentId,
                                    studentName: student.fullName,
                                    courseTitle: course.courseTitle,
                                  })
                                }
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail panel — 3 cols, sticky */}
          {selected && (
            <div className="lg:col-span-3">
              <div className="sticky top-6">
                <StudentDetailPanel
                  studentId={selected.studentId}
                  courseId={selected.courseId}
                  fullName={selected.fullName}
                  onClose={() => setSelected(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(open) => { if (!open) setConfirmRemove(null); }}
        title="Retirer l'etudiant"
        description={
          confirmRemove
            ? `Retirer ${confirmRemove.studentName} du cours "${confirmRemove.courseTitle}" ?`
            : ""
        }
        confirmLabel="Retirer"
        isPending={isRemoving}
        onConfirm={() => {
          if (!confirmRemove) return;
          removeStudent({ courseId: confirmRemove.courseId, studentId: confirmRemove.studentId });
          setConfirmRemove(null);
        }}
      />
    </>
  );
}

// ── Detail panel ──────────────────────────────────────────────────

function StudentDetailPanel({
  studentId,
  courseId,
  fullName,
  onClose,
}: {
  studentId: string;
  courseId: string;
  fullName: string;
  onClose: () => void;
}): React.JSX.Element {
  const { data, isLoading } = useStudentEngagement(studentId, courseId);

  if (isLoading || !data) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
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
  const gradedAttempts = data.attempts.filter((a) => a.finalScore !== null);
  const avgPct = gradedAttempts.length
    ? Math.round(
        gradedAttempts.reduce((s, a) => s + (a.finalScore ?? 0), 0) /
          gradedAttempts.length,
      )
    : null;
  const attendedCount = data.attendance.filter((a) => a.attended).length;
  const attendancePct = data.attendance.length
    ? Math.round((attendedCount / data.attendance.length) * 100)
    : null;

  return (
    <div className="space-y-4 rounded-xl border bg-card">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{data.student.fullName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                className={`${LEVEL_BADGE_COLORS[data.course.level as CEFRLevel]} px-1.5 py-0 text-[10px]`}
              >
                {data.course.level}
              </Badge>
              <Link href={`/instructor/courses/${data.course.id}`} className="hover:underline">
                {data.course.title}
              </Link>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 px-5 pb-5">
        {/* Activity pill */}
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${tone.color}`}>
          <Circle className={`h-2 w-2 ${tone.dot}`} strokeWidth={0} />
          <span>Actif {tone.label}</span>
          {data.enrollment?.enrolledAt && (
            <span className="text-muted-foreground">
              · inscrit {format(new Date(data.enrollment.enrolledAt), "d MMM yyyy", { locale: fr })}
            </span>
          )}
        </div>

        {/* Metric cards — 2x2 bento grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Lecons terminees"
            value={`${completedCount} / ${data.totals.lessonCount}`}
            pct={completionPct}
            icon={<BookOpen className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Quiz participes"
            value={`${quizAttempted} / ${data.totals.quizCount}`}
            pct={quizParticipationPct}
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Score moyen"
            value={avgPct !== null ? `${avgPct}%` : "—"}
            pct={avgPct}
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Presence"
            value={attendancePct !== null ? `${attendedCount} / ${data.attendance.length}` : "—"}
            pct={attendancePct}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </div>

        {/* Quiz attempts + attendance in bento row */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Quiz attempts */}
          <Card className="border-0 shadow-none bg-muted/30">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm">Tentatives de quiz</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data.attempts.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Aucune tentative</p>
              ) : (
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  {data.attempts.map((a) => {
                    const pct = a.finalScore !== null ? Math.round(a.finalScore) : null;
                    const statusLabel =
                      a.status === "graded"
                        ? "Note"
                        : a.status === "pending_review" || a.status === "submitted"
                          ? "En attente"
                          : "En cours";
                    return (
                      <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-background/60">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{a.quizTitle}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.submittedAt
                              ? format(new Date(a.submittedAt), "d MMM yyyy", { locale: fr })
                              : "En cours"}
                            {" · "}
                            {statusLabel}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${scoreTone(pct)}`}>
                          {pct !== null ? `${pct}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session attendance */}
          <Card className="border-0 shadow-none bg-muted/30">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm">Presence</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data.attendance.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Aucune session</p>
              ) : (
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  {data.attendance
                    .slice()
                    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1))
                    .map((row) => (
                      <div key={row.sessionId} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-background/60">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{row.sessionTitle}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.scheduledAt
                              ? format(new Date(row.scheduledAt), "d MMM yyyy", { locale: fr })
                              : ""}
                          </p>
                        </div>
                        {row.attended ? (
                          <Badge className="bg-emerald-100 text-emerald-800 px-1.5 py-0 text-[10px]">
                            Present
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Absent
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  pct,
  icon,
}: {
  label: string;
  value: string;
  pct: number | null;
  icon: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {pct !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      )}
    </div>
  );
}
