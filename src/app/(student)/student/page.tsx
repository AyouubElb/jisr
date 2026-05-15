"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEnrollments } from "@/lib/hooks/useEnrollments";
import { useUpcomingSessions } from "@/lib/hooks/useSessions";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen, Calendar, Video } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CEFRLevel } from "@/lib/types";

export default function StudentDashboardPage(): React.JSX.Element {
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: sessions, isLoading: sessionsLoading } = useUpcomingSessions();

  const enrolledCourses = enrollments?.filter((e) => e.courses) ?? [];
  const nextSession = sessions?.[0];
  const isNextWithin24h =
    nextSession &&
    new Date(nextSession.scheduled_at) > new Date() &&
    differenceInHours(new Date(nextSession.scheduled_at), new Date()) <= 24;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-amber-950">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Bienvenue ! Suivez vos cours et sessions</p>
        </div>
        {/* Stat chips — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          {!enrollmentsLoading && (
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              {enrolledCourses.length} cours
            </span>
          )}
          {!sessionsLoading && (
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {sessions?.length ?? 0} sessions
            </span>
          )}
        </div>
      </div>

      {/* Hero — next session within 24h, shown on all breakpoints */}
      {!sessionsLoading && isNextWithin24h && nextSession && (
        <div className="rounded-xl border border-primary/25 bg-primary/10 p-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            Prochaine session
          </p>
          <p className="text-lg font-semibold leading-tight text-amber-950">{nextSession.title}</p>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {format(new Date(nextSession.scheduled_at), "EEEE d MMMM 'a' HH:mm", { locale: fr })}
            {nextSession.duration_minutes && ` · ${nextSession.duration_minutes} min`}
          </p>
          <a href={nextSession.meeting_link} target="_blank" rel="noopener noreferrer">
            <Button className="w-full" size="lg">
              <Video className="mr-2 h-5 w-5" />
              Rejoindre la session
            </Button>
          </a>
        </div>
      )}

      {/* Main content — stacked on mobile, 3-col grid on desktop */}
      <div className="space-y-6 md:grid md:grid-cols-5 md:gap-6 md:space-y-0">

        {/* Courses — full width mobile, 3/5 desktop */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle>Mes cours</CardTitle>
              {!enrollmentsLoading && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {enrolledCourses.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !enrolledCourses.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Vous n&apos;etes inscrit a aucun cours</p>
                <p className="text-sm text-muted-foreground">
                  Contactez votre instructeur pour etre inscrit.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrolledCourses.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/student/courses/${enrollment.course_id}`}
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 active:bg-muted"
                  >
                    <Badge className={cn("shrink-0", LEVEL_BADGE_COLORS[enrollment.courses.level as CEFRLevel])}>
                      {enrollment.courses.level}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{enrollment.courses.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        par {enrollment.courses.profiles?.full_name ?? "Instructeur"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions — full width mobile, 2/5 sticky desktop */}
        <div className="md:col-span-2 md:self-start md:sticky md:top-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle>Sessions</CardTitle>
                {!sessionsLoading && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {sessions?.length ?? 0}
                  </span>
                )}
              </div>
              <CardDescription>Vos prochaines sessions en direct</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : !sessions?.length ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Aucune session a venir</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session, index) => {
                    const sessionDate = new Date(session.scheduled_at);
                    const isHighlighted =
                      index === 0 && differenceInHours(sessionDate, new Date()) <= 24;
                    return (
                      <div
                        key={session.id}
                        className={cn(
                          "rounded-lg border p-3",
                          isHighlighted && "border-primary/25 bg-primary/5",
                        )}
                      >
                        <p className="text-sm font-medium leading-tight">{session.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(sessionDate, "EEE d MMM 'a' HH:mm", { locale: fr })}
                          {session.duration_minutes && ` · ${session.duration_minutes} min`}
                        </p>
                        <a
                          href={session.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block"
                        >
                          <Button
                            size="sm"
                            variant={isHighlighted ? "default" : "outline"}
                            className="w-full"
                          >
                            Rejoindre
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
