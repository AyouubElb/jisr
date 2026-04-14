"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEnrollments } from "@/lib/hooks/useEnrollments";
import { useUpcomingSessions } from "@/lib/hooks/useSessions";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import type { CEFRLevel } from "@/lib/types";

export default function StudentDashboardPage(): React.JSX.Element {
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: sessions, isLoading: sessionsLoading } = useUpcomingSessions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue ! Suivez vos cours et sessions</p>
        </div>
        <Link href="/student/courses">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Parcourir les cours
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cours inscrits</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{enrollments?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions a venir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{sessions?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My courses */}
      <Card>
        <CardHeader>
          <CardTitle>Mes cours</CardTitle>
          <CardDescription>Les cours auxquels vous etes inscrit</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollmentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !enrollments?.length ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Vous n&apos;etes inscrit a aucun cours</p>
              <Link href="/student/courses">
                <Button variant="outline" size="sm">
                  <Search className="mr-2 h-4 w-4" />
                  Decouvrir les cours
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments
                .filter((e) => e.courses)
                .map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/student/courses/${enrollment.course_id}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={LEVEL_BADGE_COLORS[enrollment.courses.level as CEFRLevel]}>
                        {enrollment.courses.level}
                      </Badge>
                      <div>
                        <p className="font-medium">{enrollment.courses.title}</p>
                        <p className="text-sm text-muted-foreground">
                          par {enrollment.courses.profiles?.full_name ?? "Instructeur inconnu"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions a venir</CardTitle>
          <CardDescription>Vos prochaines sessions en direct</CardDescription>
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
              <Calendar className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune session a venir</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.courses?.title} &middot;{" "}
                      {format(new Date(session.scheduled_at), "EEEE d MMMM 'a' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                    <Button size="sm">Rejoindre</Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
