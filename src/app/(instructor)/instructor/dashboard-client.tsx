"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCourses } from "@/lib/hooks/useCourses";
import { useUpcomingSessions } from "@/lib/hooks/useSessions";
import { useInstructorStudents } from "@/lib/hooks/useEnrollments";
import { useRecentActivity } from "@/lib/hooks/useEngagement";
import { useUnmarkedSessions } from "@/lib/hooks/useAttendance";
import { usePendingGradingCount } from "@/lib/hooks/useAttempts";
import { useProfile } from "@/lib/hooks/useAuth";
import { AttendanceDialog } from "@/components/course/session/attendance-dialog";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  FileText,
  ListChecks,
  Plus,
  Users,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";
import type { CEFRLevel } from "@/lib/types";

const AT_RISK_DAYS = 14;

interface AtRiskStudent {
  studentId: string;
  fullName: string;
  courseTitle: string;
  courseId: string;
  courseLevel: string;
  lastActiveAt: string | null;
}

function getAtRiskStudents(
  courses: ReturnType<typeof useInstructorStudents>["data"],
): AtRiskStudent[] {
  if (!courses) return [];
  const now = Date.now();
  const result: AtRiskStudent[] = [];

  for (const course of courses) {
    for (const student of course.students) {
      const isAtRisk =
        !student.lastActiveAt ||
        (now - new Date(student.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24) >= AT_RISK_DAYS;

      if (isAtRisk) {
        result.push({
          studentId: student.studentId,
          fullName: student.fullName,
          courseTitle: course.courseTitle,
          courseId: course.courseId,
          courseLevel: course.courseLevel,
          lastActiveAt: student.lastActiveAt,
        });
      }
    }
  }

  return result
    .sort((a, b) => {
      if (!a.lastActiveAt) return -1;
      if (!b.lastActiveAt) return 1;
      return new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime();
    })
    .slice(0, 5);
}

function activityLabel(lastActiveAt: string | null): { text: string; color: string; dot: string } {
  if (!lastActiveAt) {
    return { text: "Never active", color: "text-rose-700", dot: "text-rose-500 fill-rose-500" };
  }
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  const rel = formatDistanceToNowStrict(new Date(lastActiveAt), { locale: enUS, addSuffix: true });
  if (days >= 30) return { text: rel, color: "text-rose-700", dot: "text-rose-500 fill-rose-500" };
  return { text: rel, color: "text-amber-700", dot: "text-amber-500 fill-amber-500" };
}

export function InstructorDashboardClient(): React.JSX.Element {
  const { data: courses, isLoading: coursesLoading } = useMyCourses();
  const { data: sessions, isLoading: sessionsLoading } = useUpcomingSessions();
  const { data: enrollmentData, isLoading: enrollmentsLoading } = useInstructorStudents();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();
  const { data: unmarked } = useUnmarkedSessions();
  const { data: profile } = useProfile();
  const { data: pendingGradingCount } = usePendingGradingCount();
  const [attendanceTarget, setAttendanceTarget] = useState<{
    id: string;
    title: string;
    courseId: string;
  } | null>(null);

  const firstName = profile?.full_name?.split(" ")[0];
  const pendingCount = pendingGradingCount ?? 0;

  const publishedCount = courses?.filter((c) => c.is_published).length ?? 0;
  const draftCount = courses?.filter((c) => !c.is_published).length ?? 0;
  const totalStudents = enrollmentData
    ? new Set(enrollmentData.flatMap((c) => c.students.map((s) => s.studentId))).size
    : 0;
  const atRisk = getAtRiskStudents(enrollmentData);

  return (
    <div className="space-y-6">
      {/* ── GREETING ───────────────────────────────────────────── */}
      {pendingCount > 0 ? (
        <Link href="/instructor/grading" className="group block">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-amber-950">
            Hi {firstName ?? "there"}
          </h1>
          <p className="text-muted-foreground">
            You have{" "}
            <span className="font-semibold text-primary underline-offset-4 group-hover:underline">
              {pendingCount} submission{pendingCount !== 1 ? "s" : ""} to grade
            </span>
            <ArrowRight className="ml-1 inline h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>
      ) : (
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-amber-950">
            Hi {firstName ?? "there"}
          </h1>
          <p className="text-muted-foreground">All caught up — no pending submissions</p>
        </div>
      )}

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Published courses"
          value={publishedCount}
          icon={<BookOpen className="h-4 w-4" />}
          loading={coursesLoading}
        />
        <StatCard
          label="Drafts"
          value={draftCount}
          icon={<BookOpen className="h-4 w-4" />}
          loading={coursesLoading}
        />
        <StatCard
          label="Students"
          value={totalStudents}
          icon={<Users className="h-4 w-4" />}
          loading={enrollmentsLoading}
          variant="hero"
        />
        <StatCard
          label="Upcoming sessions"
          value={sessions?.length ?? 0}
          icon={<Calendar className="h-4 w-4" />}
          loading={sessionsLoading}
        />
      </div>

      {/* ── ATTENDANCE NUDGE ───────────────────────────────────── */}
      {unmarked && unmarked.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-700" />
                <CardTitle className="text-base text-amber-900">
                  {unmarked.length} session{unmarked.length !== 1 ? "s" : ""} need attendance
                </CardTitle>
              </div>
              {unmarked.length > 3 && (
                <Link
                  href="/instructor/sessions?tab=past"
                  className="text-xs text-amber-800 hover:underline"
                >
                  View all
                </Link>
              )}
            </div>
            <CardDescription className="text-amber-800/80">
              Past sessions still missing a presence list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unmarked.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.courseTitle}
                      {" · "}
                      {format(new Date(s.scheduledAt), "EEE MMM d 'at' HH:mm", { locale: enUS })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() =>
                      setAttendanceTarget({ id: s.id, title: s.title, courseId: s.courseId })
                    }
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Mark
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── QUICK ACTIONS ROW ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Link href="/instructor/courses/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                New course
              </Button>
            </Link>
            <Link href="/instructor/courses" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                New lesson
              </Button>
            </Link>
            <Link href="/instructor/courses" className="block">
              <Button variant="outline" className="w-full justify-start">
                <ListChecks className="mr-2 h-4 w-4" />
                New quiz
              </Button>
            </Link>
            <Link href="/instructor/sessions" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule session
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── BENTO GRID: at-risk + activity feed ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* At-risk */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-base">At-risk students</CardTitle>
            </div>
            <CardDescription>
              Inactive for {AT_RISK_DAYS}+ days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : atRisk.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm text-muted-foreground">
                  All your students are active
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {atRisk.map((s) => {
                  const tone = activityLabel(s.lastActiveAt);
                  return (
                    <Link
                      key={`${s.studentId}-${s.courseId}`}
                      href={`/instructor/students?student=${s.studentId}&courseId=${s.courseId}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                        {s.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.fullName}</p>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Badge
                            className={`${LEVEL_BADGE_COLORS[s.courseLevel as CEFRLevel]} px-1.5 py-0 text-[10px]`}
                          >
                            {s.courseLevel}
                          </Badge>
                          <span className="truncate text-muted-foreground">{s.courseTitle}</span>
                        </div>
                      </div>
                      <div className={`flex shrink-0 items-center gap-1 text-xs ${tone.color}`}>
                        <Circle className={`h-2 w-2 ${tone.dot}`} strokeWidth={0} />
                        <span>{tone.text}</span>
                      </div>
                    </Link>
                  );
                })}
                <Link
                  href="/instructor/students"
                  className="block pt-2 text-center text-sm text-primary hover:underline"
                >
                  View all students
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>
              Latest actions from your students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !activity?.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No activity yet
                </p>
              </div>
            ) : (
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {activity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        item.type === "lesson_completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.type === "lesson_completed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{item.studentName}</span>
                        {" "}
                        {item.type === "lesson_completed"
                          ? "completed the lesson"
                          : "submitted the quiz"}
                        {" "}
                        <span className="font-medium">{item.label}</span>
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{item.courseTitle}</span>
                        <span>&middot;</span>
                        <span>
                          {formatDistanceToNowStrict(new Date(item.timestamp), {
                            locale: enUS,
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BENTO GRID: courses (wider) + sessions ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Recent courses — spans 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">My courses</CardTitle>
            <CardDescription>Your recent courses</CardDescription>
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !courses?.length ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No courses yet</p>
                <Link href="/instructor/courses/new">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create a course
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {courses.slice(0, 5).map((course) => (
                  <Link
                    key={course.id}
                    href={`/instructor/courses/${course.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                        {course.level}
                      </Badge>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{course.title}</p>
                        <p className="truncate text-sm text-muted-foreground line-clamp-1">
                          {course.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant={course.is_published ? "default" : "secondary"} className="shrink-0">
                      {course.is_published ? "Published" : "Draft"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming sessions — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Upcoming sessions</CardTitle>
            <CardDescription>Your next sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !sessions?.length ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No sessions scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.courses?.title} &middot;{" "}
                        {format(new Date(session.scheduled_at), "EEE MMM d 'at' HH:mm", { locale: enUS })}
                      </p>
                    </div>
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="outline" size="sm">
                        Join
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {attendanceTarget && (
        <AttendanceDialog
          sessionId={attendanceTarget.id}
          courseId={attendanceTarget.courseId}
          sessionTitle={attendanceTarget.title}
          open={!!attendanceTarget}
          onOpenChange={(open) => { if (!open) setAttendanceTarget(null); }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  loading,
  variant,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  variant?: "hero";
}): React.JSX.Element {
  const isHero = variant === "hero";
  return (
    <Card className={isHero ? "bg-primary/8 ring-1 ring-primary/20" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-sm font-medium ${isHero ? "text-amber-950" : ""}`}>
          {label}
        </CardTitle>
        <span className={isHero ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-2xl font-bold ${isHero ? "text-amber-950" : ""}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
