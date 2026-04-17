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
  Clock,
  ExternalLink,
  Video,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import type { SessionWithCourse } from "@/lib/api/sessions.api";

const PAGE_SIZE = 8;

type TabValue = "all" | "upcoming" | "past";

interface SessionsPageContentProps {
  sessions: SessionWithCourse[] | undefined;
  isLoading: boolean;
  /** Show the "Rejoindre" button (student) or not (instructor may just view) */
  showJoinButton: boolean;
}

export function SessionsPageContent({
  sessions,
  isLoading,
  showJoinButton,
}: SessionsPageContentProps): React.JSX.Element {
  const [tab, setTab] = useState<TabValue>("all");
  const [page, setPage] = useState(0);

  // Reset page when switching tabs
  const handleTabChange = (value: string): void => {
    setTab(value as TabValue);
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (tab === "upcoming") return sessions.filter((s) => !isPast(new Date(s.scheduled_at)));
    if (tab === "past") return sessions.filter((s) => isPast(new Date(s.scheduled_at)));
    return sessions;
  }, [sessions, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const upcomingCount = sessions?.filter((s) => !isPast(new Date(s.scheduled_at))).length ?? 0;
  const pastCount = sessions?.filter((s) => isPast(new Date(s.scheduled_at))).length ?? 0;

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
        <TabsList>
          <TabsTrigger value="all">
            Toutes
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {sessions?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            A venir
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {upcomingCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past">
            Passees
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {pastCount}
            </Badge>
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
                ? "Aucune session a venir"
                : tab === "past"
                  ? "Aucune session passee"
                  : "Aucune session"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pageItems.map((session) => {
            const past = isPast(new Date(session.scheduled_at));
            return (
              <div
                key={session.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
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
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Terminee
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{session.courses?.title}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(session.scheduled_at), "EEE d MMM yyyy", { locale: fr })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.scheduled_at), "HH:mm", { locale: fr })}
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
                      Rejoindre
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
                      Lien
                    </Button>
                  </a>
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
            Page {page + 1} sur {totalPages}
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
    </div>
  );
}
