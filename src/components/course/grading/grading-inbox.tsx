"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { useGradingInbox } from "@/lib/hooks/useAttempts";
import { AttemptGradingPane } from "./attempt-grading-pane";
import type { GradingAttempt } from "@/lib/api/attempts.api";
import type { CEFRLevel } from "@/lib/types";

type Filter = "pending" | "all" | "graded";

export function GradingInbox(): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>("pending");
  const [courseId, setCourseId] = useState<string>("all");
  const [studentId, setStudentId] = useState<string>("all");
  const [selected, setSelected] = useState<GradingAttempt | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);

  const { data: attempts, isLoading } = useGradingInbox(filter);

  const courseOptions = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, { id: string; title: string; level: CEFRLevel }>();
    for (const a of attempts) {
      if (!map.has(a.course_id)) {
        map.set(a.course_id, {
          id: a.course_id,
          title: a.course_title,
          level: a.course_level,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [attempts]);

  const studentOptions = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const a of attempts) {
      if (courseId !== "all" && a.course_id !== courseId) continue;
      if (!map.has(a.student_id)) {
        map.set(a.student_id, { id: a.student_id, name: a.student_name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attempts, courseId]);

  const grouped = useMemo(() => {
    if (!attempts) return [];
    const filtered = attempts.filter((a) => {
      if (courseId !== "all" && a.course_id !== courseId) return false;
      if (studentId !== "all" && a.student_id !== studentId) return false;
      return true;
    });

    const byQuiz = new Map<
      string,
      {
        quiz_id: string;
        quiz_title: string;
        course_title: string;
        course_level: CEFRLevel;
        attempts: GradingAttempt[];
      }
    >();

    for (const a of filtered) {
      const existing = byQuiz.get(a.quiz_id);
      if (existing) {
        existing.attempts.push(a);
      } else {
        byQuiz.set(a.quiz_id, {
          quiz_id: a.quiz_id,
          quiz_title: a.quiz_title,
          course_title: a.course_title,
          course_level: a.course_level,
          attempts: [a],
        });
      }
    }

    return Array.from(byQuiz.values()).sort(
      (a, b) =>
        Math.min(...a.attempts.map((x) => new Date(x.submitted_at).getTime())) -
        Math.min(...b.attempts.map((x) => new Date(x.submitted_at).getTime())),
    );
  }, [attempts, courseId, studentId]);

  const openAttempt = (a: GradingAttempt): void => {
    setSelected(a);
    setPaneOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">A corriger</h1>
        <p className="text-muted-foreground">
          Tentatives en attente de votre correction manuelle
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="w-fit justify-start gap-1 rounded-xl border border-border bg-muted/40 p-2">
            <TabsTrigger
              value="pending"
              className="group gap-2 rounded-lg px-5 py-4 data-active:bg-background data-active:shadow-md data-active:ring-1 data-active:ring-border/60"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>En attente</span>
              {attempts !== undefined && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground group-data-active:bg-primary/10 group-data-active:text-primary">
                  {attempts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="gap-2 rounded-lg px-5 py-4 data-active:bg-background data-active:shadow-md data-active:ring-1 data-active:ring-border/60"
            >
              <span>Tout</span>
            </TabsTrigger>
            <TabsTrigger
              value="graded"
              className="gap-2 rounded-lg px-5 py-4 data-active:bg-background data-active:shadow-md data-active:ring-1 data-active:ring-border/60"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Corriges</span>
            </TabsTrigger>
          </TabsList>

          <div className="ml-auto flex flex-wrap gap-2">
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v ?? "all");
                setStudentId("all");
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cours</SelectItem>
                {courseOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    [{c.level}] {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={studentId} onValueChange={(v) => setStudentId(v ?? "all")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Etudiant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les etudiants</SelectItem>
                {studentOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-3">
              {grouped.map((group) => (
                <QuizGroup
                  key={group.quiz_id}
                  group={group}
                  onAttemptClick={openAttempt}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AttemptGradingPane attempt={selected} open={paneOpen} onOpenChange={setPaneOpen} />
    </div>
  );
}

// ── Collapsible quiz group ──────────────────────────────────────────

interface QuizGroupData {
  quiz_id: string;
  quiz_title: string;
  course_title: string;
  course_level: CEFRLevel;
  attempts: GradingAttempt[];
}

function QuizGroup({
  group,
  onAttemptClick,
}: {
  group: QuizGroupData;
  onAttemptClick: (a: GradingAttempt) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const pendingCount = group.attempts.filter((a) => a.pending_count > 0).length;

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Badge className={LEVEL_BADGE_COLORS[group.course_level]}>{group.course_level}</Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{group.quiz_title}</p>
            <p className="truncate text-xs text-muted-foreground">{group.course_title}</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {pendingCount} en attente
            </Badge>
          )}
          <Badge variant="outline" className="shrink-0">
            {group.attempts.length}{" "}
            {group.attempts.length === 1 ? "tentative" : "tentatives"}
          </Badge>
        </button>

        {expanded && (
          <div className="divide-y border-t">
            {group.attempts.map((a) => (
              <AttemptRow
                key={a.attempt_id}
                attempt={a}
                onClick={() => onAttemptClick(a)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ageInDays(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

function AttemptRow({
  attempt,
  onClick,
}: {
  attempt: GradingAttempt;
  onClick: () => void;
}): React.JSX.Element {
  const isPending = attempt.pending_count > 0;
  const submitted = formatDistanceToNowStrict(new Date(attempt.submitted_at), {
    locale: fr,
    addSuffix: true,
  });
  const isStale = isPending && ageInDays(attempt.submitted_at) >= 7;
  const gradedManual = attempt.manual_count - attempt.pending_count;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        {attempt.student_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{attempt.student_name}</p>
          {attempt.auto_score !== null && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              Auto {attempt.auto_score}%
            </span>
          )}
          {isPending ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
              {attempt.pending_count} / {attempt.manual_count} a corriger
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-900">
              <CheckCircle2 className="h-3 w-3" />
              {gradedManual} / {attempt.manual_count} corrige
            </span>
          )}
        </div>
        <p className={`text-xs ${isStale ? "text-rose-600" : "text-muted-foreground"}`}>
          Soumis {submitted}
        </p>
      </div>
      {!isPending && attempt.final_score !== null && (
        <span className="shrink-0 text-sm font-semibold text-emerald-700">
          {attempt.final_score}%
        </span>
      )}
    </button>
  );
}

function EmptyState({ filter }: { filter: Filter }): React.JSX.Element {
  const message =
    filter === "pending"
      ? "Aucune tentative en attente de correction"
      : filter === "graded"
        ? "Aucune tentative corrigee"
        : "Aucune tentative";
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <ClipboardCheck className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
