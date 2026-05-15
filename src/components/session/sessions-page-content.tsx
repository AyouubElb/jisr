"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { SessionWithCourse } from "@/lib/api/sessions.api";

const hasEnded = (s: { scheduled_at: string; duration_minutes: number | null }): boolean =>
  new Date(s.scheduled_at).getTime() + (s.duration_minutes ?? 0) * 60_000 <= Date.now();
import { AttendanceDialog } from "@/components/course/session/attendance-dialog";

const PAGE_SIZE = 8;

type TabValue = "all" | "upcoming" | "past";

interface SessionsPageContentProps {
  sessions: SessionWithCourse[] | undefined;
  isLoading: boolean;
  /** Show the "Rejoindre" button (student) or not (instructor may just view) */
  showJoinButton: boolean;
  /** Instructor-only — past session IDs still needing attendance */
  unmarkedSessionIds?: Set<string>;
}

export function SessionsPageContent({
  sessions,
  isLoading,
  showJoinButton,
  unmarkedSessionIds,
}: SessionsPageContentProps): React.JSX.Element {
  const [tab, setTab] = useState<TabValue>("all");
  const [page, setPage] = useState(0);
  const [attendanceTarget, setAttendanceTarget] = useState<{
    id: string;
    title: string;
    courseId: string;
  } | null>(null);

  // Reset page when switching tabs
  const handleTabChange = (value: string): void => {
    setTab(value as TabValue);
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (tab === "upcoming") return sessions.filter((s) => !hasEnded(s));
    if (tab === "past") return sessions.filter((s) => hasEnded(s));
    return sessions;
  }, [sessions, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const upcomingCount = sessions?.filter((s) => !hasEnded(s)).length ?? 0;
  const pastCount = sessions?.filter((s) => hasEnded(s)).length ?? 0;

  const t = showJoinButton
    ? {
        all: "Toutes",
        upcoming: "A venir",
        past: "Passees",
        emptyAll: "Aucune session",
        emptyUpcoming: "Aucune session a venir",
        emptyPast: "Aucune session passee",
      }
    : {
        all: "All",
        upcoming: "Upcoming",
        past: "Past",
        emptyAll: "No sessions",
        emptyUpcoming: "No upcoming sessions",
        emptyPast: "No past sessions",
      };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start gap-1 rounded-xl border border-border bg-muted/40 p-2">
          <TabsTrigger
            value="all"
            className="gap-1.5 rounded-lg px-3 py-2 md:px-5 md:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <span>{t.all}</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {sessions?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="gap-1.5 rounded-lg px-3 py-2 md:px-5 md:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <span>{t.upcoming}</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {upcomingCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="gap-1.5 rounded-lg px-3 py-2 md:px-5 md:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <span>{t.past}</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {pastCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Session list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {tab === "upcoming"
                ? t.emptyUpcoming
                : tab === "past"
                  ? t.emptyPast
                  : t.emptyAll}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pageItems.map((session) => {
            const past = hasEnded(session);
            const needsAttendance = !showJoinButton && past && !!unmarkedSessionIds?.has(session.id);
            const endedLabel = showJoinButton ? "Terminee" : needsAttendance ? "Not marked" : "Ended";
            const linkLabel = showJoinButton ? "Rejoindre" : "Link";
            const dateLocale = showJoinButton ? fr : undefined;
            return (
              <div
                key={session.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/30 md:px-4 md:py-4"
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    past
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Video className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    {past && (
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${
                          needsAttendance ? "border-amber-300 bg-amber-50 text-amber-800" : ""
                        }`}
                      >
                        {endedLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{session.courses?.title}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(session.scheduled_at), "EEE d MMM yyyy", { locale: dateLocale })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.scheduled_at), "HH:mm", { locale: dateLocale })}
                      {" · "}
                      {session.duration_minutes} min
                    </span>
                  </div>
                </div>

                {/* Action */}
                {showJoinButton && !past && session.meeting_link && (
                  <a
                    href={session.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button size="sm" variant="outline" className="gap-1.5">
                      {linkLabel}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {!showJoinButton && !past && session.meeting_link && (
                  <a
                    href={session.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      {linkLabel}
                    </Button>
                  </a>
                )}
                {needsAttendance && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() =>
                      setAttendanceTarget({
                        id: session.id,
                        title: session.title,
                        courseId: session.course_id,
                      })
                    }
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Mark attendance
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} {showJoinButton ? "sur" : "of"} {totalPages}
            {" · "}
            {filtered.length} session{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
