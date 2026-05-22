"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalibration } from "@/lib/hooks/useAIAdmin";
import { getRubric } from "@/lib/ai/eval/rubrics";
import type { AgreementRow } from "@/lib/api/ai-admin.api";

// Quiz-gen is the only judged agent today. Hardcode its rubric key.
const RUBRIC_KEY = "quiz_gen_v2";

// >=80% agreement is the bar from the calibration discussion: below it, the
// judge isn't trustworthy enough to gate on.
const TRUST_BAR = 80;

export function CalibrationContent(): React.JSX.Element {
  const { data, isLoading } = useCalibration(RUBRIC_KEY);
  const rubric = getRubric(RUBRIC_KEY);

  const criterionLabel = useMemo(() => {
    const m = new Map<string, string>();
    rubric?.criteria.forEach((c) => m.set(c.key, c.label));
    return m;
  }, [rubric]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          Judge calibration
        </h1>
        <p className="text-muted-foreground">
          How often the LLM judge agrees with your human evaluations on{" "}
          {rubric?.label ?? RUBRIC_KEY}. Scale criteria agree within 1 point;
          pass/fail must match exactly.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data || data.pairCount === 0 ? (
        <EmptyState />
      ) : (
        <>
          <OverallCard
            overallPct={data.overallPct}
            pairCount={data.pairCount}
          />
          <PerCriterionCard
            perCriterion={data.perCriterion}
            criterionLabel={criterionLabel}
          />
          <PairsTable rows={data.rows} criterionLabel={criterionLabel} />
        </>
      )}
    </div>
  );
}

function OverallCard({
  overallPct,
  pairCount,
}: {
  overallPct: number | null;
  pairCount: number;
}): React.JSX.Element {
  const trusted = overallPct !== null && overallPct >= TRUST_BAR;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Overall agreement
          </p>
          <p className="text-4xl font-bold text-amber-950">
            {overallPct === null ? "—" : `${overallPct}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            across {pairCount} judged + human-rated generation
            {pairCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          {overallPct === null ? null : trusted ? (
            <Badge className="bg-emerald-100 text-emerald-900">
              Above {TRUST_BAR}% — trustworthy to gate
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-900">
              Below {TRUST_BAR}% — sharpen the judge before gating
            </Badge>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Target: {pairCount < 30 ? "rate 30+ to trust this number" : "ready"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PerCriterionCard({
  perCriterion,
  criterionLabel,
}: {
  perCriterion: Record<string, { agree: number; total: number }>;
  criterionLabel: Map<string, string>;
}): React.JSX.Element {
  const entries = Object.entries(perCriterion).sort((a, b) => {
    const pa = a[1].total > 0 ? a[1].agree / a[1].total : 0;
    const pb = b[1].total > 0 ? b[1].agree / b[1].total : 0;
    return pa - pb; // worst first — those are the criteria to fix
  });

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <p className="text-sm font-semibold text-amber-950">
          Agreement by criterion
        </p>
        <p className="text-xs text-muted-foreground">
          Worst first. A low criterion means the judge&apos;s definition of that
          criterion disagrees with yours — sharpen that one rule in the judge
          prompt, not the generator.
        </p>
        <div className="space-y-2">
          {entries.map(([key, { agree, total }]) => {
            const pct = total > 0 ? Math.round((agree / total) * 100) : 0;
            const weak = pct < TRUST_BAR;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-sm text-amber-950">
                  {criterionLabel.get(key) ?? key}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${weak ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {pct}% ({agree}/{total})
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PairsTable({
  rows,
  criterionLabel,
}: {
  rows: AgreementRow[];
  criterionLabel: Map<string, string>;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <p className="text-sm font-semibold text-amber-950">
          Disagreements to review
        </p>
        <div className="space-y-2">
          {rows.map((row) => (
            <PairRow
              key={row.generation_id}
              row={row}
              criterionLabel={criterionLabel}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PairRow({
  row,
  criterionLabel,
}: {
  row: AgreementRow;
  criterionLabel: Map<string, string>;
}): React.JSX.Element {
  const keys = Array.from(
    new Set([
      ...Object.keys(row.human_scores ?? {}),
      ...Object.keys(row.judge_scores ?? {}),
    ]),
  );

  const diffs = keys.filter((k) => {
    const h = (row.human_scores as Record<string, unknown>)?.[k];
    const j = (row.judge_scores as Record<string, unknown>)?.[k];
    if (typeof h === "boolean" && typeof j === "boolean") return h !== j;
    if (typeof h === "number" && typeof j === "number") {
      return Math.abs(h - j) > 1;
    }
    return false;
  });

  return (
    <Link
      href={`/admin/ai/generations/${row.generation_id}`}
      className="block rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {row.generation_id.slice(0, 8)}…
        </span>
        {diffs.length === 0 ? (
          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
            full agreement
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-300 text-amber-800">
            {diffs.length} disagree
          </Badge>
        )}
      </div>
      {diffs.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs">
          {diffs.map((k) => (
            <li key={k} className="text-amber-950">
              <span className="font-medium">
                {criterionLabel.get(k) ?? k}
              </span>
              {": human "}
              {formatScore((row.human_scores as Record<string, unknown>)?.[k])}
              {" → judge "}
              {formatScore((row.judge_scores as Record<string, unknown>)?.[k])}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function formatScore(v: unknown): string {
  if (typeof v === "boolean") return v ? "pass" : "fail";
  if (typeof v === "number") return String(v);
  return "—";
}

function EmptyState(): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No generations have both a human and a judge evaluation yet.
        </p>
        <p className="text-xs text-muted-foreground">
          Generate quizzes (the judge now scores them automatically), then rate
          them in the generations list. Pairs appear here once both exist.
        </p>
      </CardContent>
    </Card>
  );
}
