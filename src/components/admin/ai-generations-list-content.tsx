"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIGenerations } from "@/lib/hooks/useAIAdmin";
import type { AIGenerationListItem } from "@/lib/api/ai-admin.api";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function AIGenerationsListContent(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [feature, setFeature] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [instructorId, setInstructorId] = useState<string>("");
  const [onlyUnrated, setOnlyUnrated] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAIGenerations({
    feature: feature || undefined,
    model: model || undefined,
    onlyUnrated,
    onlyErrors,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const distinctModels = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.model);
    return Array.from(set).sort();
  }, [rows]);

  const distinctInstructors = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!r.user_id) continue;
      if (!map.has(r.user_id)) {
        map.set(r.user_id, r.user_full_name ?? "(no name)");
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (instructorId && r.user_id !== instructorId) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.title?.toLowerCase().includes(s) ?? false) ||
      r.model.toLowerCase().includes(s) ||
      r.feature.toLowerCase().includes(s) ||
      (r.user_full_name?.toLowerCase().includes(s) ?? false) ||
      r.id.toLowerCase().startsWith(s)
    );
  });

  // Reset to page 0 on filter change (render-time, not an effect).
  const filterKey = `${search}|${feature}|${model}|${instructorId}|${onlyUnrated}|${onlyErrors}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  // ── Stats (computed from the loaded rows) ──────────────────────
  const total = rows.length;
  const schemaOk = rows.filter((r) => !r.error && r.schema_valid).length;
  const evaluatedCount = rows.filter((r) => r.has_evaluation).length;
  const totalCostCents = rows.reduce(
    (sum, r) => sum + (r.cost_cents ? Number(r.cost_cents) : 0),
    0,
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">AI generations</h1>
        <p className="text-muted-foreground">
          Quality evaluation and tracking of AI output
        </p>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="col-span-2 flex flex-col justify-between rounded-xl border bg-primary p-5 text-primary-foreground">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium opacity-80">Generations</p>
            <Sparkles className="h-5 w-5 opacity-60" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-20 bg-primary-foreground/20" />
          ) : (
            <>
              <p className="mt-1 text-4xl font-bold tracking-tight">{total}</p>
              <p className="text-sm opacity-70">
                {evaluatedCount} of {total} evaluated
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Valid schema
            </p>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-12" />
          ) : (
            <>
              <p className="mt-3 text-3xl font-bold">
                {total > 0 ? Math.round((schemaOk / total) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                {schemaOk} / {total}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Total cost
            </p>
            <span className="text-xs font-mono text-muted-foreground">¢</span>
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-12" />
          ) : (
            <>
              <p className="mt-3 text-3xl font-bold">
                {totalCostCents.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ ${(totalCostCents / 100).toFixed(2)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── FILTER BAR + LIST ──────────────────────────────────── */}
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-3 border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search (title, instructor, model, feature, id…)"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All features</option>
                <option value="quiz_gen">quiz_gen</option>
                <option value="free_text_grade">free_text_grade</option>
                <option value="voice_grade">voice_grade</option>
                <option value="intervention_suggest">intervention_suggest</option>
                <option value="lesson_outline">lesson_outline</option>
              </select>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All models</option>
                {distinctModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All instructors</option>
                {distinctInstructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={onlyUnrated}
                  onChange={(e) => setOnlyUnrated(e.target.checked)}
                />
                To evaluate
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={onlyErrors}
                  onChange={(e) => setOnlyErrors(e.target.checked)}
                />
                Errors
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search || feature || model || instructorId || onlyUnrated || onlyErrors
                  ? "No generation matches the filters"
                  : "No generations yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {paginated.map((r) => (
                  <GenerationRow
                    key={r.id}
                    row={r}
                    onClick={() =>
                      router.push(`/admin/ai/generations/${r.id}`)
                    }
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {filtered.length === 0
                      ? "0 results"
                      : `${safePage * pageSize + 1}–${Math.min(
                          (safePage + 1) * pageSize,
                          filtered.length,
                        )} of ${filtered.length}`}
                  </span>
                  <span aria-hidden>·</span>
                  <label className="flex items-center gap-1.5">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Page {safePage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage === 0}
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages - 1}
                    onClick={() =>
                      setPage(Math.min(totalPages - 1, safePage + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GenerationRow({
  row,
  onClick,
}: {
  row: AIGenerationListItem;
  onClick: () => void;
}): React.JSX.Element {
  const status = row.error
    ? { icon: XCircle, color: "text-red-600 bg-red-50" }
    : row.schema_valid
      ? { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" }
      : { icon: AlertTriangle, color: "text-amber-600 bg-amber-50" };
  const StatusIcon = status.icon;

  const instr = row.instructor_accepted
    ? { label: "Accepted", variant: "default" as const }
    : row.instructor_edited
      ? { label: "Edited", variant: "secondary" as const }
      : row.instructor_rejected
        ? { label: "Deleted", variant: "destructive" as const }
        : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${status.color}`}
      >
        <StatusIcon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="line-clamp-1 block min-w-0 flex-1 text-sm font-medium">
            {row.title ?? <span className="text-muted-foreground italic">(untitled)</span>}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {row.feature}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {row.model}
          </span>
          {row.user_full_name ? (
            <span className="font-medium text-foreground/80">
              {row.user_full_name}
            </span>
          ) : null}
          <span>
            {formatDistanceToNowStrict(new Date(row.created_at), {
              locale: enUS,
              addSuffix: true,
            })}
            {row.latency_ms !== null
              ? ` · ${(row.latency_ms / 1000).toFixed(1)}s`
              : ""}
            {row.cost_cents !== null
              ? ` · ${Number(row.cost_cents).toFixed(2)}¢`
              : ""}
          </span>
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {instr ? (
          <Badge variant={instr.variant} className="text-[10px]">
            {instr.label}
          </Badge>
        ) : null}
        {row.has_evaluation ? (
          <Badge variant="default" className="bg-emerald-600 text-[10px]">
            Evaluated
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            To evaluate
          </Badge>
        )}
      </div>
    </button>
  );
}
