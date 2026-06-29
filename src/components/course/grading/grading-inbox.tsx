"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataListCard, PAGE_SIZE_OPTIONS } from "@/components/admin/data-list-card";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { useGradingInbox, usePendingGradingCount } from "@/lib/hooks/useAttempts";
import { AttemptGradingPane } from "./attempt-grading-pane";
import type { GradingAttempt } from "@/lib/api/attempts.api";
import type { CEFRLevel } from "@/lib/types";

type Filter = "pending" | "all" | "graded";

export function GradingInbox(): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>("pending");
  const [courseId, setCourseId] = useState<string>("all");
  const [quizId, setQuizId] = useState<string>("all");
  const [studentId, setStudentId] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);

  const { data: attempts, isLoading } = useGradingInbox(filter);
  const { data: pendingCount } = usePendingGradingCount();

  const selected = useMemo(
    () => attempts?.find((a) => a.attempt_id === selectedId) ?? null,
    [attempts, selectedId],
  );

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

  // Quiz options follow the selected course, so the dropdown only offers
  // quizzes that can actually appear in the filtered list.
  const quizOptions = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, { id: string; title: string; level: CEFRLevel }>();
    for (const a of attempts) {
      if (courseId !== "all" && a.course_id !== courseId) continue;
      if (!map.has(a.quiz_id)) {
        map.set(a.quiz_id, { id: a.quiz_id, title: a.quiz_title, level: a.course_level });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [attempts, courseId]);

  const studentOptions = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const a of attempts) {
      if (courseId !== "all" && a.course_id !== courseId) continue;
      if (quizId !== "all" && a.quiz_id !== quizId) continue;
      if (!map.has(a.student_id)) {
        map.set(a.student_id, { id: a.student_id, name: a.student_name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attempts, courseId, quizId]);

  // Flat list: apply all filters, then newest-first.
  const filtered = useMemo(() => {
    if (!attempts) return [];
    return attempts
      .filter((a) => {
        if (courseId !== "all" && a.course_id !== courseId) return false;
        if (quizId !== "all" && a.quiz_id !== quizId) return false;
        if (studentId !== "all" && a.student_id !== studentId) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
      );
  }, [attempts, courseId, quizId, studentId]);

  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const handleFilterChange = (next: Filter): void => {
    setFilter(next);
    setPage(0);
  };

  // Course narrows quiz + student, so reset both downstream filters with it.
  const handleCourseChange = (next: string | null): void => {
    setCourseId(next ?? "all");
    setQuizId("all");
    setStudentId("all");
    setPage(0);
  };

  const handleQuizChange = (next: string | null): void => {
    setQuizId(next ?? "all");
    setStudentId("all");
    setPage(0);
  };

  const handleStudentChange = (next: string | null): void => {
    setStudentId(next ?? "all");
    setPage(0);
  };

  const openAttempt = (a: GradingAttempt): void => {
    setSelectedId(a.attempt_id);
    setPaneOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">To grade</h1>
        <p className="text-muted-foreground">
          Attempts awaiting your manual review
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => handleFilterChange(v as Filter)}>
        <TabsList className="w-fit justify-start gap-1 rounded-xl border border-border bg-muted/40 p-2">
          <TabsTrigger
            value="pending"
            className="group gap-2 rounded-lg px-5 py-4 data-active:bg-background data-active:shadow-md data-active:ring-1 data-active:ring-border/60"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Pending</span>
            {pendingCount !== undefined && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground group-data-active:bg-primary/10 group-data-active:text-primary">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="gap-2 rounded-lg px-5 py-4 data-active:bg-background data-active:shadow-md data-active:ring-1 data-active:ring-border/60"
          >
            <span>All</span>
          </TabsTrigger>
          <TabsTrigger
            value="graded"
            className="gap-2 rounded-lg px-5 py-4 data-active:bg-background data-active:shadow-md data-active:ring-1 data-active:ring-border/60"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Graded</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <DataListCard
            isLoading={isLoading}
            isEmpty={filtered.length === 0}
            loadingRowCount={5}
            emptyState={{
              icon: <ClipboardCheck />,
              message:
                filter === "pending"
                  ? "No attempts awaiting review"
                  : filter === "graded"
                    ? "No graded attempts"
                    : "No attempts",
            }}
            filters={
              <div className="flex flex-wrap gap-2">
                <Select value={courseId} onValueChange={handleCourseChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courseOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        [{c.level}] {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={quizId} onValueChange={handleQuizChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Quiz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All quizzes</SelectItem>
                    {quizOptions.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={studentId} onValueChange={handleStudentChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    {studentOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
            pagination={{
              page,
              pageSize,
              totalCount: filtered.length,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(0);
              },
              pageSizeOptions: PAGE_SIZE_OPTIONS,
            }}
          >
            {pageItems.map((a) => (
              <AttemptRow key={a.attempt_id} attempt={a} onClick={() => openAttempt(a)} />
            ))}
          </DataListCard>
        </TabsContent>
      </Tabs>

      <AttemptGradingPane attempt={selected} open={paneOpen} onOpenChange={setPaneOpen} />
    </div>
  );
}

// ── Attempt row ─────────────────────────────────────────────────────

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
    locale: enUS,
    addSuffix: true,
  });
  const isStale = isPending && ageInDays(attempt.submitted_at) >= 7;
  const gradedManual = attempt.manual_count - attempt.pending_count;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30 md:px-4 md:py-4"
    >
      <Badge
        className={`${LEVEL_BADGE_COLORS[attempt.course_level]} shrink-0`}
      >
        {attempt.course_level}
      </Badge>
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
              {attempt.pending_count} / {attempt.manual_count} to grade
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-900">
              <CheckCircle2 className="h-3 w-3" />
              {gradedManual} / {attempt.manual_count} graded
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {attempt.quiz_title}
          {" · "}
          {attempt.course_title}
        </p>
        <p className={`text-xs ${isStale ? "text-rose-600" : "text-muted-foreground"}`}>
          Submitted {submitted}
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
