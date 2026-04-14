"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCourses } from "@/lib/hooks/useCourses";
import { useUpcomingSessions } from "@/lib/hooks/useSessions";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen, Calendar, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import type { CEFRLevel } from "@/lib/types";

export default function InstructorDashboardPage(): React.JSX.Element {
  const { data: courses, isLoading: coursesLoading } = useMyCourses();
  const { data: sessions, isLoading: sessionsLoading } = useUpcomingSessions();

  const publishedCount = courses?.filter((c) => c.is_published).length ?? 0;
  const draftCount = courses?.filter((c) => !c.is_published).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Gerez vos cours et sessions</p>
        </div>
        <Link href="/instructor/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau cours
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cours publies</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{publishedCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{draftCount}</p>
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

      {/* Recent courses */}
      <Card>
        <CardHeader>
          <CardTitle>Mes cours</CardTitle>
          <CardDescription>Vos cours recents</CardDescription>
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
              <p className="text-muted-foreground">Aucun cours pour le moment</p>
              <Link href="/instructor/courses/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Creer un cours
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 5).map((course) => (
                <Link
                  key={course.id}
                  href={`/instructor/courses/${course.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                      {course.level}
                    </Badge>
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {course.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={course.is_published ? "default" : "secondary"}>
                    {course.is_published ? "Publie" : "Brouillon"}
                  </Badge>
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
              <p className="text-muted-foreground">Aucune session planifiee</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
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
                  <a
                    href={session.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      Rejoindre
                    </Button>
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
