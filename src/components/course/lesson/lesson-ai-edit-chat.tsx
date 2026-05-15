"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageSquare, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useProposeAILessonEdit } from "@/lib/hooks/useAILesson";
import type { ProposeLessonEditResponse } from "@/lib/api/ai.api";
import { applyDiffDecision } from "@/lib/ai/lesson-diff";
import { normalizeHtml } from "@/lib/ai/html-normalize";

interface LessonAIEditChatProps {
  lessonId: string;
  // Current lesson HTML — sent so we can show "before" diff in editor.
  currentContent: string;
  // Fired when a proposal arrives. Parent swaps editor into diff preview.
  onProposalChange: (
    proposal: { generationId: string | null; summary: string; newContent: string; diffHtml: string } | null,
  ) => void;
  // Accept handler — parent saves newContent to form/db.
  onAccept: (newContent: string) => void;
  onClose?: () => void;
}

type TurnStatus = "accepted" | "rejected" | "reply";

interface ChatTurn {
  prompt: string;
  summary: string;
  status: TurnStatus;
}

const MAX_HISTORY_TURNS = 10;

const EXAMPLES = [
  "Rewrite the introduction",
  "Add 3 examples for the present simple",
  "Simplify the vocabulary for A1",
  "Fix the typos",
];

const formatHistory = (turns: ChatTurn[]): string => {
  if (turns.length === 0) return "";
  return [...turns]
    .reverse()
    .map((t, i) => {
      const idx = turns.length - i;
      const tag =
        t.status === "reply" ? "reply" : t.status === "accepted" ? "accepted" : "rejected";
      return `${idx}. "${t.prompt}" → ${tag}: ${t.summary}`;
    })
    .join("\n");
};

export function LessonAIEditChat({
  lessonId,
  currentContent,
  onProposalChange,
  onAccept,
  onClose,
}: LessonAIEditChatProps): React.JSX.Element {
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<{
    generationId: string | null;
    summary: string;
    newContent: string;
    diffHtml: string;
  } | null>(null);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const { mutate: propose, isPending: isProposing } = useProposeAILessonEdit();

  useEffect(() => {
    const el = scrollBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, proposal]);

  const pruneHistory = (turns: ChatTurn[]): ChatTurn[] =>
    turns.slice(-MAX_HISTORY_TURNS);

  const onSubmit = (): void => {
    const trimmed = instruction.trim();
    if (!trimmed || isProposing) return;
    const formattedHistory = formatHistory(history);
    if (formattedHistory) {
      console.groupCollapsed(
        `[AI lesson edit] chat history sent (${history.length} turns)`,
      );
      console.log(formattedHistory);
      console.groupEnd();
    }
    propose(
      {
        lessonId,
        instruction: trimmed,
        chatHistory: formattedHistory,
        currentContent,
      },
      {
        onSuccess: (res: ProposeLessonEditResponse) => {
          if (res.kind === "reply") {
            setHistory((prev) =>
              pruneHistory([
                ...prev,
                { prompt: trimmed, summary: res.summary, status: "reply" },
              ]),
            );
            setInstruction("");
            return;
          }
          const next = {
            generationId: res.generationId,
            summary: res.summary,
            newContent: res.newContent,
            diffHtml: res.diffHtml,
          };
          setProposal(next);
          onProposalChange(next);
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

  const onAcceptAll = (): void => {
    if (!proposal) return;
    // Drop deletions, unwrap insertions, then normalize — the diff path
    // leaves empty tag skeletons when blocks change; clean them before
    // they reach the form/DB instead of waiting for the next request.
    onAccept(normalizeHtml(applyDiffDecision(proposal.diffHtml, "accept")));
    setHistory((prev) =>
      pruneHistory([
        ...prev,
        { prompt: instruction.trim() || proposal.summary, summary: proposal.summary, status: "accepted" },
      ]),
    );
    setProposal(null);
    onProposalChange(null);
    setInstruction("");
  };

  const onRejectAll = (): void => {
    if (!proposal) return;
    // Restore original directly — no diff math needed, currentContent is the pre-proposal truth.
    onAccept(currentContent);
    setHistory((prev) =>
      pruneHistory([
        ...prev,
        { prompt: instruction.trim() || proposal.summary, summary: proposal.summary, status: "rejected" },
      ]),
    );
    setProposal(null);
    onProposalChange(null);
    setInstruction("");
  };

  const onResetConversation = (): void => {
    setHistory([]);
    setProposal(null);
    onProposalChange(null);
    setInstruction("");
  };

  // Show "before" preview length so the instructor sees the lesson is loaded.
  const wordCount = currentContent
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header — full-width, flush to card edges */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="flex-1 text-sm font-semibold">AI Assistant</h3>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onResetConversation}
            disabled={isProposing}
            title="Reset conversation"
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

      {/* Scrollable body */}
      <div ref={scrollBodyRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">

      {history.length === 0 && !proposal && !isProposing ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Ask the AI to modify this lesson. You review each change before it is applied.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Current lesson: {wordCount} word{wordCount !== 1 ? "s" : ""}
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

      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map((turn, i) => (
            <PastTurnCard key={i} turn={turn} />
          ))}
        </div>
      ) : null}

      {proposal ? (
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                AI Summary
              </p>
              <p className="text-sm">{proposal.summary}</p>
              <p className="text-[11px] italic text-muted-foreground">
                Diff shown in the editor. Accept to apply.
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRejectAll}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Reject
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onAcceptAll}
              className="ml-auto"
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Accept
            </Button>
          </div>
        </div>
      ) : null}

      </div>{/* end scrollable body */}

      {/* Sticky input area */}
      <div className="shrink-0 space-y-2 border-t px-4 pb-4 pt-3">
        {isProposing ? (
          <div className="flex items-center gap-2 text-xs italic text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>AI is thinking…</span>
          </div>
        ) : null}
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. rewrite the introduction, add examples…"
          rows={3}
          className="resize-none text-sm"
          disabled={isProposing || proposal !== null}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            ⌘/Ctrl + Enter to send
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={!instruction.trim() || isProposing || proposal !== null}
          >
            {isProposing ? "Thinking…" : "Ask"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PastTurnCard({ turn }: { turn: ChatTurn }): React.JSX.Element {
  const tone =
    turn.status === "reply"
      ? "border-primary/20 bg-primary/5"
      : turn.status === "accepted"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-muted bg-muted/30";

  const label =
    turn.status === "accepted"
      ? "✓ applied"
      : turn.status === "rejected"
        ? "✗ rejected"
        : null;

  return (
    <Card className={tone}>
      <CardContent className="space-y-1.5 p-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            You
          </span>
          <span className="flex-1 text-xs">{turn.prompt}</span>
          {label ? (
            <Badge
              variant="secondary"
              className={
                turn.status === "accepted"
                  ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }
            >
              {label}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-start gap-2 pl-9">
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-primary">
            AI
          </span>
          <p className="flex-1 text-xs leading-relaxed">{turn.summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
