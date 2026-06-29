"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { DataListCard, PAGE_SIZE_OPTIONS } from "@/components/admin/data-list-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttemptReviewSheet } from "@/components/course/quiz-review/attempt-review-sheet";
import { useQuizResults } from "@/lib/hooks/useAttempts";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import type { CEFRLevel } from "@/lib/types";
import type { QuizResultRow } from "@/lib/api/attempts.api";

const PASS_THRESHOLD = 50;

interface QuizResultsContentProps {
  courseId: string;
  quizId: string;
}

export function QuizResultsContent({
  courseId,
  quizId,
}: QuizResultsContentProps): React.JSX.Element {
  const { data, isLoading } = useQuizResults(quizId);

  const [studentId, setStudentId] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const attempts = useMemo(() => data?.attempts ?? [], [data]);

  const studentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attempts) map.set(a.student_id, a.student_name);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [attempts]);

  const filtered = useMemo(
    () =>
      studentId === "all"
        ? attempts
        : attempts.filter((a) => a.student_id === studentId),
    [attempts, studentId],
  );

  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => {
    const scored = attempts.filter((a) => a.final_score !== null);
    const avg = scored.length
      ? Math.round(scored.reduce((s, a) => s + (a.final_score ?? 0), 0) / scored.length)
      : 0;
    const passed = scored.filter((a) => (a.final_score ?? 0) >= PASS_THRESHOLD).length;
    const passRate = scored.length ? Math.round((passed / scored.length) * 100) : 0;
    return { avg, passRate };
  }, [attempts]);

  const openAttempt = (a: QuizResultRow): void => {
    setSelected({ id: a.attempt_id, name: a.student_name });
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/instructor/courses/${courseId}`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to course
        </Link>
        {isLoading || !data ? (
          <Skeleton className="h-9 w-72" />
        ) : (
          <>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight text-amber-950">
              <Badge className={LEVEL_BADGE_COLORS[data.course_level as CEFRLevel]}>
                {data.course_level}
              </Badge>
              {data.quiz_title}
            </h1>
            <p className="text-muted-foreground">{data.course_title} · Results</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Attempts"
          value={attempts.length}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          variant="hero"
        />
        <StatCard
          label="Average score"
          value={stats.avg}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={isLoading}
          description="%"
        />
        <StatCard
          label="Pass rate"
          value={stats.passRate}
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={isLoading}
          description={`${PASS_THRESHOLD}%+`}
        />
      </div>

      <DataListCard
        isLoading={isLoading}
        isEmpty={filtered.length === 0}
        loadingRowCount={5}
        emptyState={{ icon: <ClipboardList />, message: "No attempts yet" }}
        filters={
          <Select
            value={studentId}
            onValueChange={(v) => {
              setStudentId(v ?? "all");
              setPage(0);
            }}
          >
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
          <ResultRow key={a.attempt_id} attempt={a} onView={() => openAttempt(a)} />
        ))}
      </DataListCard>

      <AttemptReviewSheet
        attemptId={selected?.id ?? null}
        studentName={selected?.name ?? ""}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function ResultRow({
  attempt,
  onView,
}: {
  attempt: QuizResultRow;
  onView: () => void;
}): React.JSX.Element {
  const isPending = attempt.pending_count > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        {attempt.student_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attempt.student_name}</p>
        <p className="text-xs text-muted-foreground">
          Submitted{" "}
          {format(new Date(attempt.submitted_at), "MMM d, yyyy", { locale: enUS })}
        </p>
      </div>

      {isPending ? (
        <Badge variant="secondary" className="shrink-0">
          {attempt.auto_score !== null ? `Auto ${attempt.auto_score}% · ` : ""}
          pending
        </Badge>
      ) : (
        attempt.final_score !== null && (
          <span className="shrink-0 text-sm font-semibold text-emerald-700">
            {attempt.final_score}%
          </span>
        )
      )}

      <Button variant="outline" size="sm" className="shrink-0" onClick={onView}>
        View
      </Button>
    </div>
  );
}
