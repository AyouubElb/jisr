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
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIEvaluation, useAIGeneration } from "@/lib/hooks/useAIAdmin";
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
  const { data: existingEval } = useAIEvaluation(id, rubric?.key ?? "");
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
          Génération introuvable.
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
    ? { variant: "destructive" as const, label: "Erreur" }
    : gen.schema_valid
      ? { variant: "default" as const, label: "Schéma valide" }
      : { variant: "secondary" as const, label: "Schéma invalide" };

  return (
    <div className="space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Link
          href="/admin/ai/generations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux générations
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Évaluation de la génération</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(gen.created_at), "PPPp", { locale: fr })}
            </p>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </div>

      {/* ── TELEMETRY CARD ─────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              icon={<Cpu className="h-4 w-4" />}
              label="Modèle"
              value={gen.model}
              mono
            />
            <Stat
              icon={<Database className="h-4 w-4" />}
              label="Fournisseur"
              value={gen.provider}
            />
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Latence"
              value={
                gen.latency_ms !== null
                  ? `${(gen.latency_ms / 1000).toFixed(1)} s`
                  : "—"
              }
            />
            <Stat
              icon={<Coins className="h-4 w-4" />}
              label="Coût"
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
                Erreur de génération
              </p>
              <p className="mt-1 text-destructive/90">{gen.error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── INPUT CONTEXT (friendly) ───────────────────────────── */}
      <AIInputContextPanel feature={gen.feature} inputContext={inputCtx} />

      {/* ── QUIZ PREVIEW + EVAL FORM ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <Tabs defaultValue="ai-output">
            <TabsList>
              <TabsTrigger value="ai-output">Sortie IA</TabsTrigger>
              <TabsTrigger value="diff">Modifications</TabsTrigger>
            </TabsList>

            <TabsContent value="ai-output" className="mt-3">
              {parsed.success ? (
                <AIOutputPreview output={parsed.data} />
              ) : gen.error ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Aucune sortie — la génération a échoué.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <p className="text-sm font-medium">
                      Sortie brute (impossible à parser comme quiz)
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
              generationId={gen.id}
              rubric={rubric}
              existing={existingEval ?? null}
            />
          ) : (
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Pas de rubrique
                </p>
                <p className="text-muted-foreground">
                  Aucune rubrique définie pour la fonctionnalité{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {gen.feature}
                  </code>
                  . Ajoutez-la dans{" "}
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
