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
import type { AIQuizChange } from "@/lib/ai/schemas/quiz-edit.schema";
import type { ProposeQuizEditResponse } from "@/lib/api/ai.api";
import type { AIQuizBlock } from "@/lib/ai/schemas/quiz-output.schema";

interface QuizAIEditChatProps {
  quizId: string;
  onClose?: () => void;
  /** Editor uses this to rehydrate its local block state after apply. */
  onApplied?: () => void;
}

interface PendingProposal {
  generationId: string;
  summary: string;
  changes: AIQuizChange[];
  /** Per-change inclusion: true = will be applied, false = skipped. */
  included: boolean[];
}

type TurnStatus = "accepted" | "rejected";

interface TurnOutcome {
  kind: "add" | "update" | "delete";
  blockRef?: string;
  blockType?: string;
  status: TurnStatus;
}

interface ChatTurn {
  prompt: string;
  outcomes: TurnOutcome[];
  /** Full proposed changes + per-change accept flag — used to re-render diffs. */
  proposedChanges: AIQuizChange[];
  accepted: boolean[];
  summary: string;
}

const MAX_HISTORY_TURNS = 10;
const KEEP_AFTER_ACCEPTS = 3;

/**
 * Drop turns past the cap and prune anything older than the last N accepted
 * actions — old turns rarely matter once state has moved on.
 */
function pruneHistory(turns: ChatTurn[]): ChatTurn[] {
  const capped = turns.slice(-MAX_HISTORY_TURNS);
  let acceptedCount = 0;
  for (let i = capped.length - 1; i >= 0; i--) {
    const accepted = capped[i].outcomes.some((o) => o.status === "accepted");
    if (accepted) acceptedCount += 1;
    if (acceptedCount >= KEEP_AFTER_ACCEPTS && i > 0) {
      return capped.slice(i);
    }
  }
  return capped;
}

/** Compact human-readable history for the router prompt. */
function formatHistory(turns: ChatTurn[]): string {
  if (turns.length === 0) return "";
  const reversed = [...turns].reverse();
  return reversed
    .map((t, i) => {
      const idx = reversed.length - i;
      const outcomes = t.outcomes
        .map((o) => {
          const ref = o.blockRef ? ` ${o.blockRef}` : "";
          const tp = o.blockType ? ` (${o.blockType})` : "";
          return `${o.kind}${ref}${tp} — ${o.status}`;
        })
        .join("; ");
      return `${idx}. "${t.prompt}" → ${outcomes || "no changes"}`;
    })
    .join("\n");
}

/** Short prefix of a UUID — readable + still matchable against current ids. */
function shortRef(id: string): string {
  return id.slice(0, 8);
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
  onApplied,
}: QuizAIEditChatProps): React.JSX.Element {
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<PendingProposal | null>(null);
  // In-session conversation memory. Lost on refresh by design.
  const [history, setHistory] = useState<ChatTurn[]>([]);

  const { mutate: propose, isPending: isProposing } = useProposeAIQuizEdit();
  const { mutate: apply, isPending: isApplying } = useApplyAIQuizEdit(quizId);

  // Fetch the saved blocks from the same React Query cache the editor uses.
  // Apply invalidates this cache so before/after stays in sync.
  const { data: quiz } = useQuiz(quizId);
  const blocksById = useMemo(() => {
    type DbBlock = {
      id: string;
      type: string;
      order: number;
      content: Record<string, unknown> | null;
    };
    const blocks = (quiz?.quiz_blocks ?? []) as DbBlock[];
    // Sort by order so visible numbers (#1, #2…) match the editor.
    const sorted = blocks.slice().sort((a, b) => a.order - b.order);
    const map = new Map<string, DbBlock & { displayNumber: number }>();
    sorted.forEach((b, i) => {
      map.set(b.id, { ...b, displayNumber: i + 1 });
    });
    return map;
  }, [quiz]);

  const onSubmit = (): void => {
    const trimmed = instruction.trim();
    if (!trimmed || isProposing) return;
    const formattedHistory = formatHistory(history);
    if (formattedHistory) {
      console.groupCollapsed(
        `[AI quiz edit] chat history sent (${history.length} turns)`,
      );
      console.log(formattedHistory);
      console.groupEnd();
    } else {
      console.log("[AI quiz edit] chat history sent: (empty — first turn)");
    }
    propose(
      {
        quizId,
        instruction: trimmed,
        chatHistory: formattedHistory,
      },
      {
        onSuccess: (res: ProposeQuizEditResponse) => {
          // Empty changes = router replied conversationally. Skip the
          // proposal flow and push the reply straight into history.
          if (res.changes.length === 0) {
            setHistory((prev) =>
              pruneHistory([
                ...prev,
                {
                  prompt: trimmed,
                  summary: res.summary,
                  outcomes: [],
                  proposedChanges: [],
                  accepted: [],
                },
              ]),
            );
            setInstruction("");
            return;
          }
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

  const setInclusion = (idx: number, value: boolean): void => {
    setProposal((prev) =>
      prev
        ? {
            ...prev,
            included: prev.included.map((v, i) => (i === idx ? value : v)),
          }
        : prev,
    );
  };

  const recordTurn = (
    prompt: string,
    summary: string,
    proposedChanges: AIQuizChange[],
    accepted: boolean[],
  ): void => {
    const outcomes: TurnOutcome[] = proposedChanges.map((c, i) => {
      const status: TurnStatus = accepted[i] ? "accepted" : "rejected";
      if (c.kind === "delete_block") {
        return {
          kind: "delete",
          blockRef: shortRef(c.block_id),
          status,
        };
      }
      if (c.kind === "update_block") {
        return {
          kind: "update",
          blockRef: shortRef(c.block_id),
          blockType: c.new_block.type,
          status,
        };
      }
      return {
        kind: "add",
        blockType: c.block.type,
        status,
      };
    });
    setHistory((prev) =>
      pruneHistory([
        ...prev,
        { prompt, summary, outcomes, proposedChanges, accepted },
      ]),
    );
  };

  const onAcceptAll = (): void => {
    if (!proposal) return;
    const filtered = proposal.changes.filter((_, i) => proposal.included[i]);
    if (filtered.length === 0) return;
    const promptUsed = instruction.trim() || proposal.summary;
    apply(
      {
        quizId,
        generationId: proposal.generationId,
        changes: filtered,
      },
      {
        onSuccess: () => {
          recordTurn(
            promptUsed,
            proposal.summary,
            proposal.changes,
            proposal.included,
          );
          setProposal(null);
          setInstruction("");
          onApplied?.();
        },
      },
    );
  };

  const onRejectAll = (): void => {
    if (!proposal) return;
    const promptUsed = instruction.trim() || proposal.summary;
    recordTurn(
      promptUsed,
      proposal.summary,
      proposal.changes,
      proposal.changes.map(() => false),
    );
    setProposal(null);
    setInstruction("");
  };

  const onResetConversation = (): void => {
    setHistory([]);
    setProposal(null);
    setInstruction("");
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
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onResetConversation}
            disabled={isProposing || isApplying}
            title="Réinitialiser la conversation"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {history.length}
          </button>
        ) : null}
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

      {/* Empty state — examples (only if no history AND nothing in flight) */}
      {history.length === 0 && !proposal && !isProposing ? (
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

      {/* History — chronological, oldest at top */}
      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map((turn, i) => (
            <PastTurnCard key={i} turn={turn} blocksById={blocksById} />
          ))}
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
                  onKeep={() => setInclusion(idx, true)}
                  onIgnore={() => setInclusion(idx, false)}
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
              onClick={onRejectAll}
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
        {isProposing ? (
          <div className="flex items-center gap-2 text-xs italic text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>L&apos;IA réfléchit…</span>
          </div>
        ) : null}
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

// ── Past turn (read-only, click to expand) ─────────────────────────────

interface PastTurnCardProps {
  turn: ChatTurn;
  blocksById: Map<
    string,
    {
      id: string;
      type: string;
      content: Record<string, unknown> | null;
      displayNumber: number;
    }
  >;
}

function PastTurnCard({ turn, blocksById }: PastTurnCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const acceptedCount = turn.accepted.filter(Boolean).length;
  const rejectedCount = turn.accepted.length - acceptedCount;
  const isReplyOnly = turn.proposedChanges.length === 0;

  const tone = isReplyOnly
    ? "border-primary/20 bg-primary/5"
    : rejectedCount === 0
    ? "border-emerald-500/30 bg-emerald-500/5"
    : acceptedCount === 0
    ? "border-muted bg-muted/30"
    : "border-amber-500/30 bg-amber-500/5";

  return (
    <Card className={tone}>
      <CardContent className="space-y-1.5 p-2.5">
        <button
          type="button"
          onClick={() => !isReplyOnly && setExpanded((v) => !v)}
          className="flex w-full items-start gap-2 text-left"
          disabled={isReplyOnly}
        >
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Vous
          </span>
          <span className="flex-1 text-xs">{turn.prompt}</span>
          {!isReplyOnly ? (
            <span className="text-[10px] text-muted-foreground">
              {expanded ? "▾" : "▸"}
            </span>
          ) : null}
        </button>

        {isReplyOnly ? (
          <div className="flex items-start gap-2 pl-9">
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-primary">
              IA
            </span>
            <p className="flex-1 text-xs leading-relaxed">{turn.summary}</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 pl-9">
            {acceptedCount > 0 ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
              >
                ✓ {acceptedCount} appliqué{acceptedCount > 1 ? "s" : ""}
              </Badge>
            ) : null}
            {rejectedCount > 0 ? (
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground hover:bg-muted"
              >
                ✗ {rejectedCount} rejeté{rejectedCount > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
        )}

        {expanded && turn.proposedChanges.length > 0 ? (
          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] italic text-muted-foreground">
              {turn.summary}
            </p>
            {turn.proposedChanges.map((change, idx) => (
              <PastChangeRow
                key={idx}
                change={change}
                accepted={turn.accepted[idx]}
                beforeBlock={
                  "block_id" in change ? blocksById.get(change.block_id) : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface PastChangeRowProps {
  change: AIQuizChange;
  accepted: boolean;
  beforeBlock:
    | {
        id: string;
        type: string;
        content: Record<string, unknown> | null;
        displayNumber: number;
      }
    | undefined;
}

function PastChangeRow({
  change,
  accepted,
  beforeBlock,
}: PastChangeRowProps): React.JSX.Element {
  const label =
    change.kind === "delete_block"
      ? "Supprimé"
      : change.kind === "add_block"
      ? "Ajouté"
      : "Modifié";
  const tone = accepted
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-muted-foreground line-through";

  const blockNumber =
    change.kind === "add_block" ? null : beforeBlock?.displayNumber ?? null;

  return (
    <div className="rounded border bg-background/50 p-2 text-[11px]">
      <div className="mb-1 flex items-center gap-1.5">
        <span className={`text-[10px] font-medium uppercase ${tone}`}>
          {label}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {blockNumber !== null ? `#${blockNumber}` : "nouveau"}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {accepted ? "✓ appliqué" : "✗ rejeté"}
        </span>
      </div>
      {change.kind === "delete_block" ? (
        <DbBlockSummary block={beforeBlock} />
      ) : change.kind === "add_block" ? (
        <AIBlockSummary block={change.block} />
      ) : (
        <AIBlockSummary block={change.new_block} />
      )}
    </div>
  );
}

// ── Change card ────────────────────────────────────────────────────────

interface ChangeCardProps {
  change: AIQuizChange;
  included: boolean;
  onKeep: () => void;
  onIgnore: () => void;
  beforeBlock:
    | {
        id: string;
        type: string;
        content: Record<string, unknown> | null;
        displayNumber: number;
      }
    | undefined;
}

function ChangeCard({
  change,
  included,
  onKeep,
  onIgnore,
  beforeBlock,
}: ChangeCardProps): React.JSX.Element {
  const blockNumber = beforeBlock?.displayNumber ?? null;

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
            blockNumber={blockNumber}
            included={included}
            onKeep={onKeep}
            onIgnore={onIgnore}
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
            blockNumber={null}
            included={included}
            onKeep={onKeep}
            onIgnore={onIgnore}
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
          blockNumber={blockNumber}
          included={included}
          onKeep={onKeep}
          onIgnore={onIgnore}
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
  blockNumber,
  included,
  onKeep,
  onIgnore,
}: {
  label: string;
  tone: "primary" | "destructive" | "success";
  /** 1-based block index in the quiz. null for new blocks (not yet inserted). */
  blockNumber: number | null;
  included: boolean;
  onKeep: () => void;
  onIgnore: () => void;
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
      {blockNumber !== null ? (
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          #{blockNumber}
        </span>
      ) : (
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          nouveau
        </span>
      )}
      <div className="ml-auto inline-flex overflow-hidden rounded-md border">
        <button
          type="button"
          onClick={onKeep}
          aria-pressed={included}
          className={
            included
              ? "inline-flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
              : "inline-flex items-center gap-1 bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
          }
        >
          <Check className="h-3 w-3" /> Garder
        </button>
        <button
          type="button"
          onClick={onIgnore}
          aria-pressed={!included}
          className={
            !included
              ? "inline-flex items-center gap-1 border-l bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
              : "inline-flex items-center gap-1 border-l bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
          }
        >
          <X className="h-3 w-3" /> Ignorer
        </button>
      </div>
    </div>
  );
}

function Reason({ text }: { text: string }): React.JSX.Element {
  return <p className="text-xs italic text-muted-foreground">« {text} »</p>;
}

// ── Block previews ─────────────────────────────────────────────────────
// Two shapes: DB blocks (rich content) vs AI blocks (flat content).

interface BlockPreview {
  prompt: string;
  options?: Array<{ label: string; isCorrect: boolean }>;
  passage?: string;
  description?: string;
}

function dbBlockToPreview(block: {
  type: string;
  content: Record<string, unknown> | null;
}): BlockPreview {
  const c = block.content ?? {};

  if (block.type === "mcq" || block.type === "free_text") {
    return {
      prompt: (c["prompt"] as string | undefined) ?? "(pas de texte)",
      options: dbOptions(c["options"]),
    };
  }
  if (block.type === "voice") {
    return { prompt: (c["prompt"] as string | undefined) ?? "(pas de texte)" };
  }
  if (block.type === "fill_blank") {
    return {
      prompt: (c["sentence"] as string | undefined) ?? "(pas de texte)",
      options: dbOptions(c["options"]),
    };
  }
  if (block.type === "text" || block.type === "audio") {
    return {
      prompt: (c["caption"] as string | undefined) ?? "Passage",
      passage: stripHtml((c["html"] as string | undefined) ?? ""),
    };
  }
  if (block.type === "section") {
    return {
      prompt: (c["title"] as string | undefined) ?? "(section sans titre)",
      description: c["description"] as string | undefined,
    };
  }
  return { prompt: "(aperçu indisponible)" };
}

function aiBlockToPreview(block: AIQuizBlock): BlockPreview {
  if (block.type === "mcq") {
    return {
      prompt: block.question,
      options: block.options.map((label, i) => ({
        label,
        isCorrect: i === block.correct_index,
      })),
    };
  }
  if (block.type === "fill_blank") {
    return {
      prompt: block.sentence,
      options: block.options.map((label, i) => ({
        label,
        isCorrect: i === block.correct_index,
      })),
    };
  }
  if (block.type === "free_text" || block.type === "voice_response") {
    return { prompt: block.question };
  }
  if (block.type === "text_passage") {
    return {
      prompt: block.caption ?? "Passage",
      passage: block.passage,
    };
  }
  if (block.type === "audio_passage") {
    return {
      prompt: block.caption ?? "Passage audio",
      passage: block.script,
      description: "🔊 Audio sera généré à l'acceptation",
    };
  }
  // section
  return {
    prompt: block.title || "(section sans titre)",
    description: block.description,
  };
}

function ExpandablePassage({ text }: { text: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED = 280;
  const isLong = text.length > COLLAPSED;
  const display = !isLong || expanded ? text : text.slice(0, COLLAPSED) + "…";

  return (
    <div className="rounded bg-muted/60 p-2 text-xs leading-relaxed text-muted-foreground">
      <p className="whitespace-pre-wrap">{display}</p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Réduire" : "Lire plus"}
        </button>
      ) : null}
    </div>
  );
}

function BlockPreviewBody({ p }: { p: BlockPreview }): React.JSX.Element {
  return (
    <>
      <p className="text-sm font-medium leading-snug">{truncate(p.prompt, 200)}</p>
      {p.passage ? <ExpandablePassage text={p.passage} /> : null}
      {p.description ? (
        <p className="text-xs text-muted-foreground">{truncate(p.description, 160)}</p>
      ) : null}
      {p.options && p.options.length > 0 ? (
        <ul className="space-y-0.5 text-xs">
          {p.options.map((o, i) => (
            <li
              key={i}
              className={
                o.isCorrect
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground"
              }
            >
              {o.isCorrect ? "✓ " : "• "}
              {truncate(o.label, 100)}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function DbBlockSummary({
  block,
}: {
  block: { type: string; content: Record<string, unknown> | null } | undefined;
}): React.JSX.Element {
  if (!block) {
    return <p className="text-xs text-muted-foreground">(bloc introuvable)</p>;
  }
  return (
    <div className="space-y-1.5">
      <TypeChip label={block.type} />
      <BlockPreviewBody p={dbBlockToPreview(block)} />
    </div>
  );
}

function AIBlockSummary({
  block,
}: {
  block: AIQuizBlock;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <TypeChip label={block.type} />
      <BlockPreviewBody p={aiBlockToPreview(block)} />
    </div>
  );
}

function dbOptions(
  raw: unknown,
): Array<{ label: string; isCorrect: boolean }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((opt) => {
    if (opt && typeof opt === "object") {
      const o = opt as { label?: unknown; is_correct?: unknown };
      return {
        label: typeof o.label === "string" ? o.label : String(o.label ?? ""),
        isCorrect: o.is_correct === true,
      };
    }
    return { label: String(opt ?? ""), isCorrect: false };
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
