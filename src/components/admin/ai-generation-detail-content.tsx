"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIEvaluations, useAIGeneration } from "@/lib/hooks/useAIAdmin";
import { useQuiz } from "@/lib/hooks/useQuizzes";
import { getDefaultRubricForFeature } from "@/lib/ai/eval/rubrics";
import { aiQuizOutputSchema } from "@/lib/ai/schemas/quiz-output.schema";
import { AIOutputPreview } from "./ai-output-preview";
import { AIInputContextPanel } from "./ai-input-context-panel";
import { BlockDiffView, type DiffBlock } from "./block-diff-view";
import { EvalForm } from "./eval-form";

interface AIGenerationDetailContentProps {
  id: string;
}

export function AIGenerationDetailContent({
  id,
}: AIGenerationDetailContentProps): React.JSX.Element {
  const { data: gen, isLoading, error } = useAIGeneration(id);
  const rubric = gen ? getDefaultRubricForFeature(gen.feature) : null;
  const { data: evals } = useAIEvaluations(id, rubric?.key ?? "");
  // Always call this hook (rules-of-hooks); it no-ops with empty id.
  const { data: liveQuiz } = useQuiz(gen?.output_quiz_id ?? "");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {error.message}
        </CardContent>
      </Card>
    );
  }
  if (!gen) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Generation not found.
        </CardContent>
      </Card>
    );
  }

  // Telemetry stores `output` as either { model_output, blocks_snapshot }
  // or directly as the model output for older rows.
  const rawOutput = gen.output as Record<string, unknown> | null;
  const candidate =
    rawOutput && "model_output" in rawOutput
      ? (rawOutput.model_output as unknown)
      : rawOutput;
  const parsed = candidate
    ? aiQuizOutputSchema.safeParse(candidate)
    : { success: false as const };
  const inputCtx = gen.input_context as Record<string, unknown> | null;

  // Diff data: original snapshot vs live blocks (if quiz still exists).
  const originalBlocks: DiffBlock[] = (() => {
    const snap = (rawOutput?.blocks_snapshot ?? null) as
      | Array<{ type: string; content: unknown; order: number }>
      | null;
    if (!Array.isArray(snap)) return [];
    return snap.map((b) => ({
      type: b.type,
      content: (b.content as Record<string, unknown> | null) ?? null,
      order: b.order,
    }));
  })();

  const quizDeleted = !gen.output_quiz_id;
  const liveBlocks: DiffBlock[] = (liveQuiz?.quiz_blocks ?? []).map((b) => ({
    type: b.type,
    content: (b.content as Record<string, unknown> | null) ?? null,
    order: b.order,
  }));

  const statusBadge = gen.error
    ? { variant: "destructive" as const, label: "Error" }
    : gen.schema_valid
      ? { variant: "default" as const, label: "Valid schema" }
      : { variant: "secondary" as const, label: "Invalid schema" };

  return (
    <div className="space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Link
          href="/admin/ai/generations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to generations
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Generation evaluation</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(gen.created_at), "PPPp", { locale: enUS })}
            </p>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </div>

      {/* ── TELEMETRY CARD ─────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              icon={<Cpu className="h-4 w-4" />}
              label="Model"
              value={gen.model}
              mono
            />
            <Stat
              icon={<Database className="h-4 w-4" />}
              label="Provider"
              value={gen.provider}
            />
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Latency"
              value={
                gen.latency_ms !== null
                  ? `${(gen.latency_ms / 1000).toFixed(1)} s`
                  : "—"
              }
            />
            <Stat
              icon={<Coins className="h-4 w-4" />}
              label="Cost"
              value={
                gen.cost_cents !== null
                  ? `${Number(gen.cost_cents).toFixed(2)} ¢`
                  : "—"
              }
              hint={
                gen.input_tokens !== null && gen.output_tokens !== null
                  ? `${gen.input_tokens} in · ${gen.output_tokens} out${
                      gen.cache_read_tokens
                        ? ` · ${gen.cache_read_tokens} cache`
                        : ""
                    }`
                  : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      {gen.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Generation error
              </p>
              <p className="mt-1 text-destructive/90">{gen.error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── INPUT CONTEXT (friendly) ───────────────────────────── */}
      <AIInputContextPanel feature={gen.feature} inputContext={inputCtx} />

      {/* ── JUDGE REASONING (LLM enumeration, before scores) ───── */}
      <JudgeReasoningPanel notes={evals?.llm?.notes ?? null} />

      {/* ── QUIZ PREVIEW + EVAL FORM ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <Tabs defaultValue="ai-output">
            <TabsList>
              <TabsTrigger value="ai-output">AI output</TabsTrigger>
              <TabsTrigger value="diff">Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="ai-output" className="mt-3">
              {parsed.success ? (
                <AIOutputPreview output={parsed.data} />
              ) : gen.error ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No output — the generation failed.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <p className="text-sm font-medium">
                      Raw output (could not be parsed as a quiz)
                    </p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs">
                      {JSON.stringify(rawOutput, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="diff" className="mt-3">
              <BlockDiffView
                originalBlocks={originalBlocks}
                liveBlocks={liveBlocks}
                quizDeleted={quizDeleted}
              />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {rubric ? (
            <EvalForm
              key={`${gen.id}-${evals?.human?.id ?? evals?.llm?.id ?? "pending"}`}
              generationId={gen.id}
              rubric={rubric}
              humanEval={evals?.human ?? null}
              llmEval={evals?.llm ?? null}
            />
          ) : (
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  No rubric
                </p>
                <p className="text-muted-foreground">
                  No rubric defined for the feature{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {gen.feature}
                  </code>
                  . Add it in{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    src/lib/ai/eval/rubrics.ts
                  </code>
                  .
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function JudgeReasoningPanel({
  notes,
}: {
  notes: string | null;
}): React.JSX.Element | null {
  if (!notes) return null;
  const observed = sectionOf(notes, "OBSERVED BLOCKS:");
  const mix = sectionOf(notes, "MIX CHECK:");
  const trailing = sectionOf(notes, "NOTES:");
  if (!observed && !mix) return null;

  const matchLine = mix?.toLowerCase() ?? "";
  const mixBadge = matchLine.includes("mismatch")
    ? { label: "MISMATCH", className: "bg-amber-100 text-amber-900" }
    : matchLine.includes("match")
      ? { label: "MATCH", className: "bg-emerald-100 text-emerald-900" }
      : null;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Judge reasoning
        </h2>

        {observed ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Observed blocks
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs leading-relaxed">
              {observed}
            </pre>
          </div>
        ) : null}

        {mix ? (
          <div>
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mix check
              </p>
              {mixBadge ? (
                <Badge className={`text-[10px] ${mixBadge.className}`}>
                  {mixBadge.label}
                </Badge>
              ) : null}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs leading-relaxed">
              {mix}
            </pre>
          </div>
        ) : null}

        {trailing ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            <p className="text-sm">{trailing}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Pull a labelled section out of the composed notes blob written by the judge
// generator ("OBSERVED BLOCKS:\n…\n\nMIX CHECK:\n…\n\nNOTES:\n…").
function sectionOf(notes: string, label: string): string | null {
  const start = notes.indexOf(label);
  if (start === -1) return null;
  const after = notes.slice(start + label.length);
  // Stop at the next ALL-CAPS LABEL: ending in a colon.
  const stop = after.search(/\n[A-Z][A-Z _]+:/);
  const body = stop === -1 ? after : after.slice(0, stop);
  return body.trim() || null;
}

function Stat({
  icon,
  label,
  value,
  hint,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}): React.JSX.Element {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
