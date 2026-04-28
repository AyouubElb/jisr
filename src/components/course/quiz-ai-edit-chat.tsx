"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useApplyAIQuizEdit,
  useProposeAIQuizEdit,
} from "@/lib/hooks/useAIQuiz";
import { useQuiz } from "@/lib/hooks/useQuizzes";
import type {
  AIQuizChange,
  AIQuizEditOutput,
} from "@/lib/ai/schemas/quiz-edit.schema";
import type { AIQuizBlock } from "@/lib/ai/schemas/quiz-output.schema";

interface QuizAIEditChatProps {
  quizId: string;
  onClose?: () => void;
}

interface PendingProposal {
  generationId: string;
  summary: string;
  changes: AIQuizChange[];
  /** Per-change inclusion: true = will be applied, false = skipped. */
  included: boolean[];
}

const EXAMPLES = [
  "Rends Q3 plus facile",
  "Ajoute une question vocale sur les voyages",
  "Reformule toutes les questions au passé simple",
  "Supprime les questions en double",
];

export function QuizAIEditChat({
  quizId,
  onClose,
}: QuizAIEditChatProps): React.JSX.Element {
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<PendingProposal | null>(null);

  const { mutate: propose, isPending: isProposing } = useProposeAIQuizEdit();
  const { mutate: apply, isPending: isApplying } = useApplyAIQuizEdit(quizId);

  // Fetch the saved blocks from the same React Query cache the editor uses.
  // Apply invalidates this cache so before/after stays in sync.
  const { data: quiz } = useQuiz(quizId);
  const blocksById = useMemo(() => {
    type DbBlock = { id: string; type: string; content: Record<string, unknown> | null };
    const map = new Map<string, DbBlock>();
    const blocks = (quiz?.quiz_blocks ?? []) as DbBlock[];
    for (const b of blocks) map.set(b.id, b);
    return map;
  }, [quiz]);

  const onSubmit = (): void => {
    const trimmed = instruction.trim();
    if (!trimmed || isProposing) return;
    propose(
      { quizId, instruction: trimmed },
      {
        onSuccess: (res: AIQuizEditOutput & { generationId: string }) => {
          setProposal({
            generationId: res.generationId,
            summary: res.summary,
            changes: res.changes,
            included: res.changes.map(() => true),
          });
        },
      },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const toggleChange = (idx: number): void => {
    setProposal((prev) =>
      prev
        ? {
            ...prev,
            included: prev.included.map((v, i) => (i === idx ? !v : v)),
          }
        : prev,
    );
  };

  const onAcceptAll = (): void => {
    if (!proposal) return;
    const filtered = proposal.changes.filter((_, i) => proposal.included[i]);
    if (filtered.length === 0) return;
    apply(
      {
        quizId,
        generationId: proposal.generationId,
        changes: filtered,
      },
      {
        onSuccess: () => {
          setProposal(null);
          setInstruction("");
        },
      },
    );
  };

  const acceptedCount = proposal
    ? proposal.included.filter(Boolean).length
    : 0;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="flex-1 text-sm font-semibold">Assistant IA</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Empty state — examples */}
      {!proposal && !isProposing ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Demandez à l&apos;IA de modifier ce quiz. Vous validez chaque
            changement avant qu&apos;il s&apos;applique.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInstruction(ex)}
                className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Loading */}
      {isProposing ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          L&apos;IA analyse le quiz et propose des changements…
        </div>
      ) : null}

      {/* Proposal */}
      {proposal ? (
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Résumé de l&apos;IA
              </p>
              <p className="text-sm">{proposal.summary}</p>
            </CardContent>
          </Card>

          {proposal.changes.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Aucun changement proposé.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {proposal.changes.map((change, idx) => (
                <ChangeCard
                  key={idx}
                  change={change}
                  included={proposal.included[idx]}
                  onToggle={() => toggleChange(idx)}
                  beforeBlock={
                    "block_id" in change
                      ? blocksById.get(change.block_id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProposal(null)}
              disabled={isApplying}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Rejeter tout
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onAcceptAll}
              disabled={isApplying || acceptedCount === 0}
              className="ml-auto"
            >
              {isApplying ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              Accepter ({acceptedCount})
            </Button>
          </div>
        </div>
      ) : null}

      {/* Input — always at bottom */}
      <div className="mt-auto space-y-2 border-t pt-3">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ex : rends Q3 plus facile, ajoute une question vocale…"
          rows={3}
          className="resize-none text-sm"
          disabled={isProposing || isApplying}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            ⌘/Ctrl + Entrée pour envoyer
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={!instruction.trim() || isProposing || isApplying}
          >
            {isProposing ? "Réflexion…" : "Demander"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Change card ────────────────────────────────────────────────────────

interface ChangeCardProps {
  change: AIQuizChange;
  included: boolean;
  onToggle: () => void;
  beforeBlock:
    | {
        id: string;
        type: string;
        content: Record<string, unknown> | null;
      }
    | undefined;
}

function ChangeCard({
  change,
  included,
  onToggle,
  beforeBlock,
}: ChangeCardProps): React.JSX.Element {
  if (change.kind === "delete_block") {
    return (
      <Card
        className={`border-destructive/30 ${
          included ? "" : "opacity-50"
        }`}
      >
        <CardContent className="space-y-2 bg-destructive/5 p-3">
          <Header
            label="SUPPRIMÉ"
            tone="destructive"
            included={included}
            onToggle={onToggle}
          />
          <DbBlockSummary block={beforeBlock} />
          <Reason text={change.reason} />
        </CardContent>
      </Card>
    );
  }

  if (change.kind === "add_block") {
    return (
      <Card
        className={`border-emerald-500/30 ${included ? "" : "opacity-50"}`}
      >
        <CardContent className="space-y-2 bg-emerald-500/5 p-3">
          <Header
            label="AJOUTÉ"
            tone="success"
            included={included}
            onToggle={onToggle}
          />
          <AIBlockSummary block={change.block} />
          <Reason text={change.reason} />
        </CardContent>
      </Card>
    );
  }

  // update_block — before/after pair
  return (
    <Card className={included ? "" : "opacity-50"}>
      <CardContent className="space-y-2 p-3">
        <Header
          label="MODIFIÉ"
          tone="primary"
          included={included}
          onToggle={onToggle}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded border border-destructive/20 bg-destructive/5 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-destructive">
              Avant
            </p>
            <DbBlockSummary block={beforeBlock} />
          </div>
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-emerald-700">
              Après
            </p>
            <AIBlockSummary block={change.new_block} />
          </div>
        </div>
        <Reason text={change.reason} />
      </CardContent>
    </Card>
  );
}

function Header({
  label,
  tone,
  included,
  onToggle,
}: {
  label: string;
  tone: "primary" | "destructive" | "success";
  included: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const variant =
    tone === "destructive"
      ? "destructive"
      : tone === "success"
        ? "default"
        : "secondary";
  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="text-[10px]">
        {label}
      </Badge>
      <button
        type="button"
        onClick={onToggle}
        className="ml-auto inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[10px] hover:bg-muted"
        title={included ? "Cliquer pour ignorer ce changement" : "Cliquer pour réinclure"}
      >
        {included ? (
          <>
            <Check className="h-3 w-3" /> Inclus
          </>
        ) : (
          <>
            <Trash2 className="h-3 w-3" /> Ignoré
          </>
        )}
      </button>
    </div>
  );
}

function Reason({ text }: { text: string }): React.JSX.Element {
  return <p className="text-xs italic text-muted-foreground">« {text} »</p>;
}

// ── Block previews ─────────────────────────────────────────────────────
// Two shapes: DB blocks (rich content with options-as-objects) vs AI blocks
// (flat content with options-as-strings + correct_index).

function DbBlockSummary({
  block,
}: {
  block: { type: string; content: Record<string, unknown> | null } | undefined;
}): React.JSX.Element {
  if (!block) {
    return <p className="text-xs text-muted-foreground">(bloc introuvable)</p>;
  }
  const c = block.content ?? {};
  const prompt =
    (c["prompt"] as string | undefined) ??
    (c["sentence"] as string | undefined) ??
    (c["caption"] as string | undefined) ??
    (c["passage"] as string | undefined) ??
    "(pas de texte)";

  let correctLabel: string | undefined;
  const opts = c["options"] as
    | Array<{ label?: string; is_correct?: boolean }>
    | undefined;
  if (Array.isArray(opts)) {
    const correct = opts.find((o) => o.is_correct);
    if (correct?.label) correctLabel = correct.label;
  }

  return (
    <div className="space-y-1">
      <TypeChip label={block.type} />
      <p className="text-sm">{truncate(prompt, 160)}</p>
      {correctLabel ? (
        <p className="text-xs text-muted-foreground">
          ✓ {truncate(correctLabel, 80)}
        </p>
      ) : null}
    </div>
  );
}

function AIBlockSummary({
  block,
}: {
  block: AIQuizBlock;
}): React.JSX.Element {
  let prompt = "";
  let correctLabel: string | undefined;

  if (block.type === "mcq" || block.type === "free_text" || block.type === "voice_response") {
    prompt = block.question;
    if (block.type === "mcq") {
      correctLabel = block.options[block.correct_index];
    }
  } else if (block.type === "fill_blank") {
    prompt = block.sentence;
    correctLabel = block.options[block.correct_index];
  } else if (block.type === "text_passage") {
    prompt = block.caption ?? block.passage;
  } else if (block.type === "audio_passage") {
    prompt = block.caption ?? block.script;
  }

  return (
    <div className="space-y-1">
      <TypeChip label={block.type} />
      <p className="text-sm">{truncate(prompt, 160)}</p>
      {correctLabel ? (
        <p className="text-xs text-muted-foreground">
          ✓ {truncate(correctLabel, 80)}
        </p>
      ) : null}
    </div>
  );
}

function TypeChip({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
      {label}
    </span>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
