"use client";

import { useMemo } from "react";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Compares the block snapshot captured at AI-generation time against the
 * current live blocks for the same quiz. Used in the eval admin to see what
 * the instructor actually changed after the AI proposed its draft.
 *
 * Matching is done by `order` since the original quiz_gen snapshot does not
 * carry block IDs (snapshot is taken pre-insert). For quiz_edit-feature rows
 * the snapshot does have ids; matching by order still works because edits
 * only insert/delete/replace — they don't reorder in Stage 1.
 */

export interface DiffBlock {
  type: string;
  content: Record<string, unknown> | null;
  order: number;
}

interface BlockDiffViewProps {
  originalBlocks: DiffBlock[];
  liveBlocks: DiffBlock[];
  /**
   * If the quiz was deleted (output_quiz_id is null), liveBlocks will be
   * empty and we can't compute a diff. Caller passes true to render the
   * deleted-state message instead of "everything was removed".
   */
  quizDeleted?: boolean;
}

type DiffEntry =
  | { kind: "unchanged"; original: DiffBlock; live: DiffBlock }
  | { kind: "modified"; original: DiffBlock; live: DiffBlock }
  | { kind: "added"; live: DiffBlock }
  | { kind: "deleted"; original: DiffBlock };

function computeDiff(
  original: DiffBlock[],
  live: DiffBlock[],
): DiffEntry[] {
  const sortedOrig = [...original].sort((a, b) => a.order - b.order);
  const sortedLive = [...live].sort((a, b) => a.order - b.order);
  const maxOrder = Math.max(
    sortedOrig[sortedOrig.length - 1]?.order ?? -1,
    sortedLive[sortedLive.length - 1]?.order ?? -1,
  );

  const origByOrder = new Map(sortedOrig.map((b) => [b.order, b]));
  const liveByOrder = new Map(sortedLive.map((b) => [b.order, b]));

  const entries: DiffEntry[] = [];
  for (let i = 0; i <= maxOrder; i++) {
    const o = origByOrder.get(i);
    const l = liveByOrder.get(i);
    if (o && l) {
      const same =
        o.type === l.type &&
        JSON.stringify(o.content ?? {}) === JSON.stringify(l.content ?? {});
      entries.push(
        same
          ? { kind: "unchanged", original: o, live: l }
          : { kind: "modified", original: o, live: l },
      );
    } else if (l && !o) {
      entries.push({ kind: "added", live: l });
    } else if (o && !l) {
      entries.push({ kind: "deleted", original: o });
    }
  }
  return entries;
}

export function BlockDiffView({
  originalBlocks,
  liveBlocks,
  quizDeleted = false,
}: BlockDiffViewProps): React.JSX.Element {
  const entries = useMemo(
    () => computeDiff(originalBlocks, liveBlocks),
    [originalBlocks, liveBlocks],
  );

  const counts = useMemo(() => {
    const c = { modified: 0, added: 0, deleted: 0, unchanged: 0 };
    for (const e of entries) c[e.kind] += 1;
    return c;
  }, [entries]);

  if (quizDeleted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <Trash2 className="h-6 w-6" />
          <p>Quiz supprimé. Comparaison indisponible jusqu&apos;à ce que la capture-à-la-suppression soit ajoutée.</p>
        </CardContent>
      </Card>
    );
  }

  if (originalBlocks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucun instantané original à comparer.
        </CardContent>
      </Card>
    );
  }

  if (counts.modified + counts.added + counts.deleted === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p>
            <span className="font-medium">Aucune modification.</span> L&apos;instructeur a accepté la sortie de l&apos;IA telle quelle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Counts */}
      <div className="flex flex-wrap gap-2 text-xs">
        <CountBadge color="muted" label={`${counts.unchanged} inchangé${counts.unchanged > 1 ? "s" : ""}`} />
        <CountBadge color="primary" label={`${counts.modified} modifié${counts.modified > 1 ? "s" : ""}`} />
        <CountBadge color="emerald" label={`${counts.added} ajouté${counts.added > 1 ? "s" : ""}`} />
        <CountBadge color="destructive" label={`${counts.deleted} supprimé${counts.deleted > 1 ? "s" : ""}`} />
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <DiffEntryCard key={idx} entry={entry} />
        ))}
      </div>
    </div>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────

function DiffEntryCard({ entry }: { entry: DiffEntry }): React.JSX.Element {
  if (entry.kind === "unchanged") {
    return (
      <Card className="opacity-60">
        <CardContent className="flex items-center gap-2 p-2.5">
          <Badge variant="outline" className="text-[10px]">
            #{entry.live.order + 1} INCHANGÉ
          </Badge>
          <BlockOneLine block={entry.live} />
        </CardContent>
      </Card>
    );
  }

  if (entry.kind === "added") {
    return (
      <Card className="border-emerald-500/30">
        <CardContent className="space-y-2 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-emerald-600 text-[10px] hover:bg-emerald-600">
              <Plus className="h-3 w-3" /> AJOUTÉ #{entry.live.order + 1}
            </Badge>
          </div>
          <BlockSummary block={entry.live} />
        </CardContent>
      </Card>
    );
  }

  if (entry.kind === "deleted") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="space-y-2 bg-destructive/5 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <Trash2 className="h-3 w-3" /> SUPPRIMÉ #{entry.original.order + 1}
            </Badge>
          </div>
          <BlockSummary block={entry.original} />
        </CardContent>
      </Card>
    );
  }

  // modified
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Pencil className="h-3 w-3" /> MODIFIÉ #{entry.live.order + 1}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded border border-destructive/20 bg-destructive/5 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-destructive">
              Original IA
            </p>
            <BlockSummary block={entry.original} />
          </div>
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-emerald-700">
              Édition de l&apos;instructeur
            </p>
            <BlockSummary block={entry.live} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Block previews ─────────────────────────────────────────────────────

function BlockSummary({ block }: { block: DiffBlock }): React.JSX.Element {
  const c = block.content ?? {};
  const prompt =
    (c["prompt"] as string | undefined) ??
    (c["sentence"] as string | undefined) ??
    (c["caption"] as string | undefined) ??
    (c["passage"] as string | undefined) ??
    (c["html"] as string | undefined) ??
    (c["title"] as string | undefined) ??
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
      <p className="text-sm">{truncate(stripHtml(prompt), 200)}</p>
      {correctLabel ? (
        <p className="text-xs text-muted-foreground">
          ✓ {truncate(correctLabel, 100)}
        </p>
      ) : null}
    </div>
  );
}

function BlockOneLine({ block }: { block: DiffBlock }): React.JSX.Element {
  const c = block.content ?? {};
  const prompt =
    (c["prompt"] as string | undefined) ??
    (c["sentence"] as string | undefined) ??
    (c["caption"] as string | undefined) ??
    (c["passage"] as string | undefined) ??
    (c["html"] as string | undefined) ??
    (c["title"] as string | undefined) ??
    "(pas de texte)";
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeChip label={block.type} />
      <span className="truncate">{truncate(stripHtml(prompt), 100)}</span>
    </span>
  );
}

function TypeChip({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
      {label}
    </span>
  );
}

function CountBadge({
  color,
  label,
}: {
  color: "muted" | "primary" | "emerald" | "destructive";
  label: string;
}): React.JSX.Element {
  const cls =
    color === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
      : color === "destructive"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : color === "primary"
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cls}`}
    >
      {label}
    </span>
  );
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
