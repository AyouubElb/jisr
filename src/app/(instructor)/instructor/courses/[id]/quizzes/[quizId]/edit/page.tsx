"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Heading,
  HelpCircle,
  ImageIcon,
  ListChecks,
  Map as MapIcon,
  Music,
  Pencil,
  Plus,
  Save,
  Sparkles,
  ToggleLeft,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { QuizAIEditChat } from "@/components/course/quiz/quiz-ai-edit-chat";
import { PassageTemplateForm } from "@/components/course/quiz/passage-template-form";
import {
  BlockWrapper,
  SectionBlockEditor,
  TextBlockEditor,
  McqBlockEditor,
  FillBlankBlockEditor,
  FreeTextBlockEditor,
  AudioBlockEditor,
  ImageBlockEditor,
  VoiceBlockEditor,
} from "@/components/course/quiz/quiz-block-editor";
import {
  createQuizSchema,
  blockContentSchemas,
  type CreateQuizInput,
  type BlockType,
  BLOCK_TYPE_LABELS_EN,
} from "@/lib/schemas/quiz.schema";
import {
  useQuiz,
  useUpdateQuiz,
  useSaveQuizBlocks,
  useDeleteQuiz,
} from "@/lib/hooks/useQuizzes";
import { useResolveAIGeneration } from "@/lib/hooks/useAIQuiz";
// import { useAutosave } from "@/lib/hooks/useAutosave"; // disabled — see hook call below

const AVAILABLE_BLOCK_TYPES: BlockType[] = [
  "section",
  "text",
  "audio",
  "image",
  "mcq",
  "fill_blank",
  "free_text",
  "voice",
];

const BLOCK_TYPE_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  section: Heading,
  text: FileText,
  audio: Music,
  image: ImageIcon,
  mcq: ListChecks,
  fill_blank: Pencil,
  free_text: HelpCircle,
  voice: Music,
};

// ── Local block state ────────────────────────────────────────────────
interface LocalBlock {
  clientId: string;
  type: BlockType;
  content: Record<string, unknown>;
  points: number | null;
  order: number;
}

function cloneBlockContent(
  type: BlockType,
  content: Record<string, unknown>,
): Record<string, unknown> {
  // Deep clone via JSON (content is plain JSONB-compatible data)
  const cloned = JSON.parse(JSON.stringify(content)) as Record<string, unknown>;

  // Regenerate MCQ option ids so keys don't collide
  if (type === "mcq" && Array.isArray(cloned.options)) {
    cloned.options = (cloned.options as { id: string; label: string; is_correct: boolean }[]).map(
      (o) => ({
        ...o,
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }),
    );
  }
  return cloned;
}

function createEmptyBlock(type: BlockType, order: number): LocalBlock {
  const defaults: Record<BlockType, Record<string, unknown>> = {
    section: { title: "", description: "" },
    text: { html: "" },
    audio: { audio_url: "", caption: "" },
    image: { image_url: "", alt: "" },
    mcq: { prompt: "", options: [], allow_multiple: false },
    fill_blank: { sentence: "", accepted_answers: [""], case_sensitive: false },
    free_text: { prompt: "", min_words: undefined, max_words: undefined },
    voice: { prompt: "", max_duration_seconds: 120 },
  };
  const isQuestion =
    type === "mcq" ||
    type === "fill_blank" ||
    type === "free_text" ||
    type === "voice";

  return {
    clientId: crypto.randomUUID(),
    type,
    content: defaults[type],
    points: isQuestion ? 1 : null,
    order,
  };
}

const EMPTY_VALUES: CreateQuizInput = {
  title: "",
  description: "",
  time_limit_minutes: null,
  passing_score: 60,
  max_attempts: null,
};

export default function QuizEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const quizId = params.quizId as string;

  const { setOpen: setSidebarOpen, setOpenMobile: setSidebarOpenMobile, isMobile } = useSidebar();
  const { data: quiz, isLoading } = useQuiz(quizId);
  const { mutate: updateQuiz, isPending: isUpdatingQuiz } = useUpdateQuiz(courseId);
  const {
    mutate: saveBlocks,
    mutateAsync: saveBlocksAsync,
    isPending: isSavingBlocks,
  } = useSaveQuizBlocks(courseId);
  const { mutate: deleteQuiz, isPending: isDeleting } = useDeleteQuiz(courseId);
  const { mutate: resolveGeneration } = useResolveAIGeneration();

  const [blocks, setBlocks] = useState<LocalBlock[]>([]);
  const [blockErrors, setBlockErrors] = useState<Record<string, string>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [openPanels, setOpenPanels] = useState<Set<string>>(
    new Set(["plan", "add-block"]),
  );
  const togglePanel = (panel: string): void =>
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
        // Settings is long — opening it auto-collapses the other two so
        // their titles stay visible without overflow.
        if (panel === "settings") {
          next.delete("plan");
          next.delete("add-block");
        }
      }
      return next;
    });
  // Set true when the AI chat applies changes; useEffect below resyncs
  // local blocks from the freshly-refetched quiz on the next render.
  const [pendingRehydrate, setPendingRehydrate] = useState(false);

  const form = useForm({
    resolver: zodResolver(createQuizSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Hydrate on mount + after AI apply (pendingRehydrate flips true).
  useEffect(() => {
    if (!quiz) return;
    form.reset({
      title: quiz.title,
      description: quiz.description ?? "",
      time_limit_minutes: quiz.time_limit_minutes,
      passing_score: quiz.passing_score ?? 60,
      max_attempts: quiz.max_attempts,
    });
    setBlocks(
      quiz.quiz_blocks
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          clientId: b.id,
          type: b.type as BlockType,
          content: b.content as Record<string, unknown>,
          points: b.weight !== null ? Number(b.weight) : null,
          order: b.order,
        })),
    );
    if (pendingRehydrate) setPendingRehydrate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id, pendingRehydrate, quiz?.quiz_blocks]);

  // ── Block ops ────────────────────────────────────────────────────
  // Scrollable container for the block list. Manual "add" handlers call
  // scrollBlocksToBottom after the state update so the new block is visible.
  const blocksListRef = useRef<HTMLDivElement>(null);
  const scrollBlocksToBottom = (): void => {
    requestAnimationFrame(() => {
      const el = blocksListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const addBlock = (type: BlockType): void => {
    setBlocks((prev) => [...prev, createEmptyBlock(type, prev.length)]);
    scrollBlocksToBottom();
  };

  // Span [start, end] of a parent + its immediately-following linked children.
  // Lone block / non-parent returns [idx, idx]. Detached strays stay outside.
  const groupSpanAt = (
    arr: LocalBlock[],
    idx: number,
  ): { start: number; end: number } => {
    if (idx < 0 || idx >= arr.length) return { start: idx, end: idx };
    const b = arr[idx]!;
    if (b.type !== "text" && b.type !== "audio") return { start: idx, end: idx };
    let end = idx;
    for (let i = idx + 1; i < arr.length; i++) {
      const c = arr[i]!.content as Record<string, unknown> | null;
      const parentRef =
        c && typeof c.passage_block_id === "string"
          ? c.passage_block_id
          : c && typeof c.audio_block_id === "string"
            ? c.audio_block_id
            : null;
      if (parentRef === b.clientId) end = i;
      else break;
    }
    return { start: idx, end };
  };

  // Parent index for a linked-child if its parent sits earlier. Otherwise -1.
  const parentIndexOf = (arr: LocalBlock[], childIdx: number): number => {
    const b = arr[childIdx];
    if (!b) return -1;
    const c = b.content as Record<string, unknown> | null;
    const parentId =
      c && typeof c.passage_block_id === "string"
        ? c.passage_block_id
        : c && typeof c.audio_block_id === "string"
          ? c.audio_block_id
          : null;
    if (!parentId) return -1;
    for (let i = 0; i < childIdx; i++) {
      if (arr[i]!.clientId === parentId) return i;
    }
    return -1;
  };

  const moveBlockToTop = (clientId: string): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx <= 0) return prev;
      // Child: clamp to first child slot inside its own group.
      const parentIdx = parentIndexOf(prev, idx);
      if (parentIdx !== -1) {
        const firstChildIdx = parentIdx + 1;
        if (idx === firstChildIdx) return prev;
        const block = prev[idx]!;
        const without = prev.filter((_, i) => i !== idx);
        return [
          ...without.slice(0, firstChildIdx),
          block,
          ...without.slice(firstChildIdx),
        ].map((b, i) => ({ ...b, order: i }));
      }
      // Parent / standalone: move whole unit to the top.
      const span = groupSpanAt(prev, idx);
      if (span.start === 0) return prev;
      const unit = prev.slice(span.start, span.end + 1);
      const before = prev.slice(0, span.start);
      const after = prev.slice(span.end + 1);
      return [...unit, ...before, ...after].map((b, i) => ({ ...b, order: i }));
    });
  };

  const moveBlockToBottom = (clientId: string): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      // Child: clamp to last child slot inside its own group.
      const parentIdx = parentIndexOf(prev, idx);
      if (parentIdx !== -1) {
        const groupEnd = groupSpanAt(prev, parentIdx).end;
        if (idx === groupEnd) return prev;
        const block = prev[idx]!;
        const without = prev.filter((_, i) => i !== idx);
        // After splice, target index is groupEnd (idx shifted down by 1).
        return [
          ...without.slice(0, groupEnd),
          block,
          ...without.slice(groupEnd),
        ].map((b, i) => ({ ...b, order: i }));
      }
      // Parent / standalone: move whole unit to the bottom.
      const span = groupSpanAt(prev, idx);
      if (span.end === prev.length - 1) return prev;
      const unit = prev.slice(span.start, span.end + 1);
      const before = prev.slice(0, span.start);
      const after = prev.slice(span.end + 1);
      return [...before, ...after, ...unit].map((b, i) => ({ ...b, order: i }));
    });
  };

  // Build a passage + N empty linked children. Children carry passage_block_id
  // (text parent) or audio_block_id (audio parent) so the link is set from
  // creation, not after.
  const addPassageWithQuestions = (cfg: {
    passageKind: "text" | "audio";
    mcqCount: number;
    fillBlankCount: number;
    caption: string;
  }): void => {
    setBlocks((prev) => {
      const parentId = crypto.randomUUID();
      const parentType: BlockType = cfg.passageKind;
      const parentContent: Record<string, unknown> =
        parentType === "text"
          ? { html: "" }
          : { audio_url: "", caption: cfg.caption || "" };
      if (parentType === "text" && cfg.caption) {
        parentContent.caption = cfg.caption;
      }

      const linkField =
        parentType === "text" ? "passage_block_id" : "audio_block_id";

      const makeChild = (childType: "mcq" | "fill_blank"): LocalBlock => {
        const childContent: Record<string, unknown> =
          childType === "mcq"
            ? { prompt: "", options: [], allow_multiple: false }
            : { sentence: "", accepted_answers: [""], case_sensitive: false };
        childContent[linkField] = parentId;
        return {
          clientId: crypto.randomUUID(),
          type: childType,
          content: childContent,
          points: 1,
          order: 0,
        };
      };

      const children: LocalBlock[] = [
        ...Array.from({ length: cfg.mcqCount }, () => makeChild("mcq")),
        ...Array.from({ length: cfg.fillBlankCount }, () =>
          makeChild("fill_blank"),
        ),
      ];

      const parent: LocalBlock = {
        clientId: parentId,
        type: parentType,
        content: parentContent,
        points: null,
        order: 0,
      };

      return [...prev, parent, ...children].map((b, i) => ({
        ...b,
        order: i,
      }));
    });
    scrollBlocksToBottom();
  };

  const addVraiFauxBlock = (): void => {
    setBlocks((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        type: "mcq",
        content: {
          prompt: "",
          allow_multiple: false,
          options: [
            { id: `opt-${Date.now()}-true`, label: "True", is_correct: false },
            { id: `opt-${Date.now()}-false`, label: "False", is_correct: false },
          ],
        },
        points: 1,
        order: prev.length,
      },
    ]);
    scrollBlocksToBottom();
  };

  // When a parent passage/audio with linked children is being removed, hold
  // the pending delete here so we can show a confirm dialog first. Standalone
  // blocks and parents with zero children go through immediately.
  const [pendingParentDelete, setPendingParentDelete] = useState<{
    clientId: string;
    childCount: number;
  } | null>(null);

  const performRemoveBlock = (clientId: string): void => {
    setBlocks((prev) => {
      // Cascade: also drop every block linked back to clientId.
      return prev
        .filter((b) => {
          if (b.clientId === clientId) return false;
          const c = b.content as Record<string, unknown> | null;
          const parentId =
            c && typeof c.passage_block_id === "string"
              ? c.passage_block_id
              : c && typeof c.audio_block_id === "string"
                ? c.audio_block_id
                : null;
          return parentId !== clientId;
        })
        .map((b, i) => ({ ...b, order: i }));
    });
  };

  const removeBlock = (clientId: string): void => {
    const target = blocks.find((b) => b.clientId === clientId);
    if (!target) return;
    const isParent = target.type === "text" || target.type === "audio";
    if (isParent) {
      const childCount = blocks.filter((b) => {
        const c = b.content as Record<string, unknown> | null;
        const parentId =
          c && typeof c.passage_block_id === "string"
            ? c.passage_block_id
            : c && typeof c.audio_block_id === "string"
              ? c.audio_block_id
              : null;
        return parentId === clientId;
      }).length;
      if (childCount > 0) {
        setPendingParentDelete({ clientId, childCount });
        return;
      }
    }
    performRemoveBlock(clientId);
  };

  // Stable fingerprint of a block list for cheap dirty checks. Includes the
  // fields the AI / save round-trip cares about; ignores transient UI fields.
  const fingerprintBlocks = (
    list: Array<{
      clientId?: string;
      id?: string;
      type: string;
      order: number;
      weight?: number | null;
      points?: number | null;
      content: Record<string, unknown> | null;
    }>,
  ): string =>
    JSON.stringify(
      list
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          id: b.clientId ?? b.id,
          type: b.type,
          order: b.order,
          weight: b.weight ?? b.points ?? null,
          content: b.content ?? {},
        })),
    );

  // Pre-AI save: persist pending manual edits so the AI's read of the DB
  // matches what the user sees on screen. No-op when nothing has changed
  // since the last hydrate.
  const preAISubmitSave = async (): Promise<void> => {
    if (blocks.length === 0 && (quiz?.quiz_blocks ?? []).length === 0) return;
    const dbBlocks = (quiz?.quiz_blocks ?? []).map((b) => ({
      id: b.id,
      type: b.type as string,
      order: b.order,
      weight: b.weight,
      content: b.content as Record<string, unknown> | null,
    }));
    if (fingerprintBlocks(blocks) === fingerprintBlocks(dbBlocks)) return;
    const blockInserts = blocks.map((b) => ({
      id: b.clientId,
      type: b.type,
      content: b.content,
      weight: b.points,
      order: b.order,
    }));
    await saveBlocksAsync({ quizId, blocks: blockInserts, silent: true });
  };

  const duplicateBlock = (clientId: string): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx === -1) return prev;
      const source = prev[idx];
      const cloned: LocalBlock = {
        clientId: crypto.randomUUID(),
        type: source.type,
        content: cloneBlockContent(source.type, source.content),
        points: source.points,
        order: idx + 1,
      };
      const next = [
        ...prev.slice(0, idx + 1),
        cloned,
        ...prev.slice(idx + 1),
      ];
      return next.map((b, i) => ({ ...b, order: i }));
    });
  };

  const moveBlock = (clientId: string, direction: "up" | "down"): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx === -1) return prev;

      // Child: shuffle only with adjacent sibling inside the same group.
      const parentIdx = parentIndexOf(prev, idx);
      if (parentIdx !== -1) {
        const groupEnd = groupSpanAt(prev, parentIdx).end;
        const target = direction === "up" ? idx - 1 : idx + 1;
        // Stay strictly between firstChild (parentIdx + 1) and groupEnd.
        if (target <= parentIdx || target > groupEnd) return prev;
        const next = [...prev];
        [next[idx], next[target]] = [next[target]!, next[idx]!];
        return next.map((b, i) => ({ ...b, order: i }));
      }

      // Parent / standalone: swap whole units (jumps over a neighbor group).
      const unit = groupSpanAt(prev, idx);
      if (direction === "up") {
        if (unit.start === 0) return prev;
        const neighborEnd = unit.start - 1;
        // If the upper neighbor is itself a child, walk back to its parent.
        const neighborParentIdx = parentIndexOf(prev, neighborEnd);
        const neighborStart =
          neighborParentIdx !== -1 ? neighborParentIdx : neighborEnd;
        const before = prev.slice(0, neighborStart);
        const neighborSlice = prev.slice(neighborStart, neighborEnd + 1);
        const unitSlice = prev.slice(unit.start, unit.end + 1);
        const after = prev.slice(unit.end + 1);
        return [...before, ...unitSlice, ...neighborSlice, ...after].map(
          (b, i) => ({ ...b, order: i }),
        );
      }
      if (unit.end === prev.length - 1) return prev;
      const neighborStart = unit.end + 1;
      const neighbor = groupSpanAt(prev, neighborStart);
      const before = prev.slice(0, unit.start);
      const unitSlice = prev.slice(unit.start, unit.end + 1);
      const neighborSlice = prev.slice(neighbor.start, neighbor.end + 1);
      const after = prev.slice(neighbor.end + 1);
      return [...before, ...neighborSlice, ...unitSlice, ...after].map(
        (b, i) => ({ ...b, order: i }),
      );
    });
  };

  const updateBlockContent = (
    clientId: string,
    content: Record<string, unknown>,
  ): void => {
    setBlocks((prev) =>
      prev.map((b) => (b.clientId === clientId ? { ...b, content } : b)),
    );
    setBlockErrors((prev) => {
      if (!prev[clientId]) return prev;
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  };

  const updateBlockPoints = (clientId: string, points: number | null): void => {
    setBlocks((prev) =>
      prev.map((b) => (b.clientId === clientId ? { ...b, points } : b)),
    );
  };

  // Parent ↔ children link map. A block is a "linked child" when its content
  // carries passage_block_id or audio_block_id pointing at another block in
  // the current list. Used to indent + rail-mark children, and to badge
  // parents with their child count.
  const { linkedParentByChild, childCountByParent } = useMemo(() => {
    const validIds = new Set(blocks.map((b) => b.clientId));
    const parentByChild = new Map<string, string>();
    const countByParent = new Map<string, number>();
    for (const b of blocks) {
      const c = b.content as Record<string, unknown> | null | undefined;
      const parentId =
        c && typeof c.passage_block_id === "string"
          ? c.passage_block_id
          : c && typeof c.audio_block_id === "string"
            ? c.audio_block_id
            : null;
      if (parentId && validIds.has(parentId)) {
        parentByChild.set(b.clientId, parentId);
        countByParent.set(parentId, (countByParent.get(parentId) ?? 0) + 1);
      }
    }
    return {
      linkedParentByChild: parentByChild,
      childCountByParent: countByParent,
    };
  }, [blocks]);

  // ── Save ─────────────────────────────────────────────────────────
  const onSave = (values: Record<string, unknown>): void => {
    const data = values as unknown as CreateQuizInput;

    // Validate each block's content against its schema
    const errors: Record<string, string> = {};
    for (const b of blocks) {
      const schema = blockContentSchemas[b.type];
      if (!schema) continue;
      const result = schema.safeParse(b.content);
      if (!result.success) {
        const issues = result.error.flatten().formErrors;
        errors[b.clientId] = issues[0] ?? result.error.flatten().fieldErrors
          ? Object.values(result.error.flatten().fieldErrors).flat()[0] ?? "Invalid block"
          : "Invalid block";
      }
    }
    setBlockErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const blockInserts = blocks.map((b) => ({
      id: b.clientId,
      type: b.type,
      content: b.content,
      weight: b.points,
      order: b.order,
    }));

    // Skip the block save round-trip when the local list matches the DB
    // (e.g. last action was an AI edit that already wrote the DB).
    const dbBlocksFingerprint = fingerprintBlocks(
      (quiz?.quiz_blocks ?? []).map((b) => ({
        id: b.id,
        type: b.type as string,
        order: b.order,
        weight: b.weight,
        content: b.content as Record<string, unknown> | null,
      })),
    );
    const blocksDirty = fingerprintBlocks(blocks) !== dbBlocksFingerprint;

    updateQuiz(
      { id: quizId, updates: data },
      {
        onSuccess: () => {
          if (!blocksDirty) {
            resolveGeneration({ quizId, action: "save" });
            router.push(`/instructor/courses/${courseId}`);
            return;
          }
          saveBlocks(
            { quizId, blocks: blockInserts },
            {
              onSuccess: () => {
                // clearDraft(); // autosave disabled
                resolveGeneration({ quizId, action: "save" });
                router.push(`/instructor/courses/${courseId}`);
              },
            },
          );
        },
      },
    );
  };

  const onDeleteConfirmed = (): void => {
    // Resolve first so instructor_rejected is set even if the user
    // navigates away before the delete mutation's success callback runs.
    resolveGeneration(
      { quizId, action: "delete" },
      {
        onSettled: () => {
          deleteQuiz(quizId, {
            onSuccess: () => {
              router.push(`/instructor/courses/${courseId}`);
            },
          });
        },
      },
    );
  };

  const isSaving = isUpdatingQuiz || isSavingBlocks;

  // ── Autosave disabled ────────────────────────────────────────────
  // To re-enable: uncomment this block + the import + toolbar indicators + restore banner + clearDraft() in onSubmit.
  // const autosaveData = { meta: form.watch(), blocks };
  // const { status: autosaveStatus, pendingRestore, acceptRestore, discardRestore, clearDraft } = useAutosave({
  //   key: `quiz-draft-${quizId}`,
  //   data: autosaveData,
  //   enabled: !!quiz,
  //   dbDebounceMs: 15000,
  //   onSave: (data) =>
  //     new Promise<void>((resolve, reject) => {
  //       const blockInserts = data.blocks.map((b) => ({ type: b.type, content: b.content, weight: b.points, order: b.order }));
  //       updateQuiz(
  //         { id: quizId, updates: data.meta as unknown as Parameters<typeof updateQuiz>[0]["updates"], silent: true },
  //         { onSuccess: () => saveBlocks({ quizId, blocks: blockInserts, silent: true }, { onSuccess: () => resolve(), onError: reject }), onError: reject },
  //       );
  //     }),
  // });
  // const onAcceptRestore = (): void => {
  //   if (!pendingRestore) return;
  //   form.reset(pendingRestore.meta);
  //   setBlocks(pendingRestore.blocks);
  //   acceptRestore();
  // };

  // ── Block renderer ───────────────────────────────────────────────
  const renderBlockEditor = (block: LocalBlock): React.JSX.Element | null => {
    switch (block.type) {
      case "section":
        return (
          <SectionBlockEditor
            content={block.content as { title?: string; description?: string }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
          />
        );
      case "text":
        return (
          <TextBlockEditor
            content={block.content as { html?: string }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
          />
        );
      case "audio":
        return (
          <AudioBlockEditor
            content={block.content as { audio_url?: string; caption?: string }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
            courseId={courseId}
            quizId={quizId}
          />
        );
      case "image":
        return (
          <ImageBlockEditor
            content={block.content as { image_url?: string; alt?: string }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
            courseId={courseId}
            quizId={quizId}
          />
        );
      case "mcq":
        return (
          <McqBlockEditor
            content={
              block.content as {
                prompt?: string;
                options?: { id: string; label: string; is_correct: boolean }[];
              }
            }
            onChange={(c) => updateBlockContent(block.clientId, c)}
          />
        );
      case "fill_blank":
        return (
          <FillBlankBlockEditor
            content={block.content as { sentence?: string; accepted_answers?: string[] }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
          />
        );
      case "free_text":
        return (
          <FreeTextBlockEditor
            content={block.content as { prompt?: string; min_words?: number }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
          />
        );
      case "voice":
        return (
          <VoiceBlockEditor
            content={block.content as { prompt?: string; max_duration_seconds?: number }}
            onChange={(c) => updateBlockContent(block.clientId, c)}
          />
        );
      default:
        return null;
    }
  };

  // ── Derived stats ────────────────────────────────────────────────
  const totalWeight = blocks
    .filter((b) => b.points !== null)
    .reduce((sum, b) => sum + (b.points ?? 0), 0);
  const questionCount = blocks.filter(
    (b) =>
      b.type === "mcq" ||
      b.type === "fill_blank" ||
      b.type === "free_text" ||
      b.type === "voice",
  ).length;

  const scrollToBlock = (clientId: string): void => {
    document
      .getElementById(`block-${clientId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const blockTocLabel = (block: LocalBlock): string => {
    const c = block.content;
    if (block.type === "mcq") return (c.prompt as string) || "QCM";
    if (block.type === "fill_blank") return (c.sentence as string) || "Fill in the blank";
    if (block.type === "free_text") return (c.prompt as string) || "Written response";
    if (block.type === "voice") return (c.prompt as string) || "Voice response";
    if (block.type === "text") return "Passage";
    if (block.type === "audio") return (c.caption as string) || "Audio";
    if (block.type === "image") return (c.alt as string) || "Image";
    return BLOCK_TYPE_LABELS_EN[block.type];
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem-72px)] flex-col gap-4 lg:h-[calc(100vh-4rem)]">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid flex-1 gap-4 lg:grid-cols-4">
          <Skeleton className="h-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-full rounded-xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-lg text-muted-foreground">Quiz not found</p>
        <Link href={`/instructor/courses/${courseId}`}>
          <Button variant="outline">Back to course</Button>
        </Link>
      </div>
    );
  }

  // ── Bento layout ─────────────────────────────────────────────────
  return (
    <form
      onSubmit={form.handleSubmit(onSave)}
      className="flex h-[calc(100vh-4rem-72px)] flex-col gap-3 md:gap-4 lg:h-[calc(100vh-4rem)]"
    >
      {/* Mobile/tablet back link — desktop uses the arrow inside the blocks card */}
      <Link
        href={`/instructor/courses/${courseId}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Link>

      {/* ── Restore banner disabled — re-enable with autosave hook ─ */}
      {/* {pendingRestore && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <span className="flex-1">Un brouillon non enregistré a été trouvé. Voulez-vous le restaurer ?</span>
          <button type="button" onClick={onAcceptRestore} className="font-medium underline underline-offset-2 hover:text-amber-700">
            Restaurer
          </button>
          <button type="button" onClick={discardRestore} className="text-amber-600 hover:text-amber-800">
            Ignorer
          </button>
        </div>
      )} */}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this quiz?"
        description="This action is irreversible. All blocks and associated responses will be lost."
        confirmLabel="Delete"
        onConfirm={onDeleteConfirmed}
        isPending={isDeleting}
      />

      <ConfirmDialog
        open={pendingParentDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingParentDelete(null);
        }}
        title="Delete passage and its questions?"
        description={
          pendingParentDelete
            ? `This passage has ${pendingParentDelete.childCount} linked ${pendingParentDelete.childCount === 1 ? "question" : "questions"}. They will also be deleted.`
            : ""
        }
        confirmLabel="Delete all"
        onConfirm={() => {
          if (pendingParentDelete) {
            performRemoveBlock(pendingParentDelete.clientId);
            setPendingParentDelete(null);
          }
        }}
      />

      {/* ── Content area: bento grid + chat panel ─────────────── */}
      <div className="flex min-h-0 flex-1 gap-3 md:gap-4">

      {/* ── Bento grid ────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 gap-3 md:gap-4 lg:grid-cols-4">
        {/* ── Left column: plan (TOC) + add-block + settings ── */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto md:gap-4 lg:col-span-1">

          {/* Plan / TOC — accordion; flex-1 only when open so it doesn't steal height */}
          <div
            className={cn(
              "hidden min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm lg:flex",
              openPanels.has("plan") ? "flex-1" : "shrink-0",
            )}
          >
            <button
              type="button"
              onClick={() => togglePanel("plan")}
              className="shrink-0 border-b border-border px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h2 className="flex-1 text-sm font-semibold text-amber-950">Plan</h2>
                {openPanels.has("plan") ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {openPanels.has("plan") && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span>{blocks.length} block{blocks.length !== 1 ? "s" : ""}</span>
                  <span>{questionCount} question{questionCount !== 1 ? "s" : ""}</span>
                  <span>Weight: {totalWeight}</span>
                  {form.watch("time_limit_minutes") && (
                    <span>{form.watch("time_limit_minutes")} min</span>
                  )}
                </div>
              )}
            </button>
            {openPanels.has("plan") && (
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {blocks.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  No blocks yet
                </p>
              ) : (
                <ul className="space-y-0.5 px-2">
                  {blocks.map((block) => {
                    const Icon = BLOCK_TYPE_ICONS[block.type];
                    if (block.type === "section") {
                      return (
                        <li key={block.clientId}>
                          <button
                            type="button"
                            onClick={() => scrollToBlock(block.clientId)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
                          >
                            <div className="h-3.5 w-0.5 shrink-0 rounded-full bg-violet-400" />
                            <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                              {(block.content.title as string) || "Section"}
                            </span>
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li key={block.clientId}>
                        <button
                          type="button"
                          onClick={() => scrollToBlock(block.clientId)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/40"
                        >
                          <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate text-[11px] text-muted-foreground">
                            {blockTocLabel(block)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            )}
          </div>

          {/* Add-block panel — accordion */}
          <div className="shrink-0 rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => togglePanel("add-block")}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-semibold text-amber-950">
                Add a block
              </span>
              {openPanels.has("add-block") ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {openPanels.has("add-block") && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
                  {AVAILABLE_BLOCK_TYPES.map((type) => {
                    const Icon = BLOCK_TYPE_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium text-amber-950 transition-colors hover:border-violet-500/50 hover:bg-violet-50"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                        <span className="truncate">{BLOCK_TYPE_LABELS_EN[type]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Templates
                  </p>
                  <button
                    type="button"
                    onClick={addVraiFauxBlock}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium text-amber-950 transition-colors hover:border-violet-500/50 hover:bg-violet-50"
                  >
                    <ToggleLeft className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <span>True / False</span>
                  </button>
                  <PassageTemplateForm onAdd={addPassageWithQuestions} />
                </div>
              </div>
            )}
          </div>

          {/* Settings — accordion */}
          <div className="shrink-0 rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => togglePanel("settings")}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-semibold text-amber-950">
                Settings
              </span>
              {openPanels.has("settings") ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {openPanels.has("settings") && (
              <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="e.g. Present Simple"
                    {...form.register("title")}
                  />
                  {form.formState.errors.title && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    rows={3}
                    placeholder="Short description..."
                    className="resize-none"
                    {...form.register("description")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time limit (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    placeholder="None"
                    {...form.register("time_limit_minutes", {
                      setValueAs: (v) =>
                        v === "" || v === null ? null : Number(v),
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Passing score (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="60"
                    {...form.register("passing_score", {
                      setValueAs: (v) => (v === "" || v === null ? 60 : Number(v)),
                    })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Minimum threshold to pass the quiz (out of 100)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    placeholder="Unlimited"
                    {...form.register("max_attempts", {
                      setValueAs: (v) =>
                        v === "" || v === null ? null : Number(v),
                    })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Maximum 5. Leave empty for unlimited attempts. An incomplete attempt (student who closes the browser) also counts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: blocks list (scrollable) ──────────── */}
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-3">
          {/* Blocks card header: back · icon · inline title + breadcrumb · actions */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4 md:py-3">
            <Link href={`/instructor/courses/${courseId}`} className="hidden lg:block">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                title="Back to course"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <ClipboardList className="h-5 w-5 shrink-0 text-violet-600" />
            <div className="min-w-0 flex-1">
              <Input
                {...form.register("title")}
                placeholder="Quiz title"
                aria-label="Quiz title"
                className="h-auto truncate border-0 bg-transparent px-0 py-0 text-sm font-semibold text-amber-950 shadow-none focus-visible:ring-0 sm:text-base"
              />
              <div
                className={`hidden items-center gap-2 text-xs text-muted-foreground ${
                  aiChatOpen ? "xl:flex" : "md:flex"
                }`}
              >
                <span>
                  {blocks.length} block{blocks.length !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>
                  {questionCount} question{questionCount !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>Weight: {totalWeight}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (isMobile) setSidebarOpenMobile(false);
                else setSidebarOpen(false);
                setAiChatOpen(true);
              }}
              disabled={isSaving || isDeleting}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="hidden md:inline">AI assistant</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isSaving || isDeleting}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden md:inline">Delete</span>
            </Button>
            <Button type="submit" size="sm" disabled={isSaving || isDeleting} className="gap-1.5">
              <Save className="h-4 w-4" />
              <span className="hidden md:inline">
                {isSaving ? "Saving..." : "Save"}
              </span>
            </Button>
          </div>

          <div
            ref={blocksListRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          >
            {blocks.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-amber-950">
                  No blocks yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the panel on the left to add a block
                </p>
              </div>
            ) : (
              blocks.map((block, idx) => {
                const isLinkedChild = linkedParentByChild.has(block.clientId);
                const childCount = childCountByParent.get(block.clientId);
                return (
                  <div
                    key={block.clientId}
                    id={`block-${block.clientId}`}
                    className={
                      isLinkedChild
                        ? "ml-6 border-l-4 border-amber-400 pl-3"
                        : undefined
                    }
                  >
                    <BlockWrapper
                      type={block.type}
                      index={idx}
                      total={blocks.length}
                      points={block.points}
                      error={blockErrors[block.clientId]}
                      childCount={childCount}
                      onMoveToTop={() => moveBlockToTop(block.clientId)}
                      onMoveUp={() => moveBlock(block.clientId, "up")}
                      onMoveDown={() => moveBlock(block.clientId, "down")}
                      onMoveToBottom={() => moveBlockToBottom(block.clientId)}
                      onDuplicate={() => duplicateBlock(block.clientId)}
                      onRemove={() => removeBlock(block.clientId)}
                      onPointsChange={(p) =>
                        updateBlockPoints(block.clientId, p)
                      }
                    >
                      {renderBlockEditor(block)}
                    </BlockWrapper>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── AI chat panel (inline, desktop only) ─────────────── */}
      {aiChatOpen && (
        <div className="hidden w-[380px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:flex">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            <QuizAIEditChat
              quizId={quizId}
              onClose={() => setAiChatOpen(false)}
              onApplied={() => setPendingRehydrate(true)}
              onPreSubmitSave={preAISubmitSave}
            />
          </div>
        </div>
      )}

      </div>{/* end content area */}
    </form>
  );
}

