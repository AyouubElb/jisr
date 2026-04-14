"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useInstructorStudents } from "@/lib/hooks/useEnrollments";
import { useRemoveStudent } from "@/lib/hooks/useEnrollments";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen, GraduationCap, Users, UserX, Circle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
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

export default function InstructorStudentsPage(): React.JSX.Element {
  const { data: courses, isLoading } = useInstructorStudents();
  const { mutate: removeStudent, isPending: isRemoving } = useRemoveStudent();

  const [confirmRemove, setConfirmRemove] = useState<{
    courseId: string;
    studentId: string;
    studentName: string;
    courseTitle: string;
  } | null>(null);

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

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* Hero stat — unique students */}
          <div className="flex flex-col justify-between rounded-xl border bg-primary p-5 text-primary-foreground md:col-span-2 lg:row-span-2">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium opacity-80">Etudiants uniques</p>
              <GraduationCap className="h-5 w-5 opacity-60" />
            </div>
            {isLoading ? (
              <Skeleton className="h-14 w-24 bg-primary-foreground/20" />
            ) : (
              <>
                <p className="text-6xl font-bold tracking-tight">{totalStudents}</p>
                <p className="text-sm opacity-70">
                  {totalEnrollments} inscription{totalEnrollments !== 1 ? "s" : ""} au total
                </p>
              </>
            )}
          </div>

          {/* Stat — courses with students */}
          <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cours actifs</p>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mt-3" />
            ) : (
              <p className="mt-3 text-3xl font-bold">{coursesWithStudents}</p>
            )}
          </div>

          {/* Stat — total courses */}
          <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cours total</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mt-3" />
            ) : (
              <p className="mt-3 text-3xl font-bold">{courses?.length ?? 0}</p>
            )}
          </div>

          {/* Course cards — each spans full width */}
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="col-span-1 rounded-xl border bg-card p-5 md:col-span-2 lg:col-span-4">
                  <Skeleton className="h-5 w-40 mb-4" />
                  <div className="space-y-3">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-12 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : !courses?.length ? (
            <div className="col-span-1 flex flex-col items-center gap-3 rounded-xl border bg-card py-16 text-center md:col-span-2 lg:col-span-4">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun cours cree pour le moment</p>
              <Link href="/instructor/courses/new">
                <Button variant="outline" size="sm">Creer un cours</Button>
              </Link>
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.courseId}
                className="col-span-1 rounded-xl border bg-card md:col-span-2 lg:col-span-4"
              >
                {/* Course header */}
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Badge className={LEVEL_BADGE_COLORS[course.courseLevel as CEFRLevel]}>
                      {course.courseLevel}
                    </Badge>
                    <Link
                      href={`/instructor/courses/${course.courseId}`}
                      className="font-semibold hover:underline"
                    >
                      {course.courseTitle}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {course.students.length} etudiant{course.students.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Student list */}
                {course.students.length === 0 ? (
                  <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Aucun etudiant inscrit
                  </div>
                ) : (
                  <div className="divide-y">
                    {course.students.map((student) => {
                      const tone = activityTone(student.lastActiveAt);
                      return (
                      <div
                        key={student.enrollmentId}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <Link
                          href={`/instructor/students/${student.studentId}?courseId=${course.courseId}`}
                          className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
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
                        </Link>
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
                          <span className="hidden sm:inline ml-1">Retirer</span>
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
