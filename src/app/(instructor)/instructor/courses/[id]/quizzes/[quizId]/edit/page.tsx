"use client";

import { useEffect, useState } from "react";
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
  Map,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { QuizAIEditChat } from "@/components/course/quiz-ai-edit-chat";
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
} from "@/components/course/quiz-block-editor";
import {
  createQuizSchema,
  blockContentSchemas,
  type CreateQuizInput,
  type BlockType,
  BLOCK_TYPE_LABELS,
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
    clientId: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
  const { mutate: saveBlocks, isPending: isSavingBlocks } = useSaveQuizBlocks(courseId);
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
  const addBlock = (type: BlockType): void => {
    setBlocks((prev) => [...prev, createEmptyBlock(type, prev.length)]);
  };

  const moveBlockToTop = (clientId: string): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx <= 0) return prev;
      const block = prev[idx]!;
      return [block, ...prev.filter((_, i) => i !== idx)];
    });
  };

  const moveBlockToBottom = (clientId: string): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx === prev.length - 1) return prev;
      const block = prev[idx]!;
      return [...prev.filter((_, i) => i !== idx), block];
    });
  };

  const addVraiFauxBlock = (): void => {
    setBlocks((prev) => [
      ...prev,
      {
        clientId: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
  };

  const removeBlock = (clientId: string): void => {
    setBlocks((prev) =>
      prev
        .filter((b) => b.clientId !== clientId)
        .map((b, i) => ({ ...b, order: i })),
    );
  };

  const duplicateBlock = (clientId: string): void => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.clientId === clientId);
      if (idx === -1) return prev;
      const source = prev[idx];
      const cloned: LocalBlock = {
        clientId: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((b, i) => ({ ...b, order: i }));
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
      type: b.type,
      content: b.content,
      weight: b.points,
      order: b.order,
    }));

    updateQuiz(
      { id: quizId, updates: data },
      {
        onSuccess: () => {
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
    return BLOCK_TYPE_LABELS[block.type];
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 sm:p-6">
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
      className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:p-6"
    >
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 sm:px-4 sm:py-3">
        <Link href={`/instructor/courses/${courseId}`}>
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <ClipboardList className="h-5 w-5 shrink-0 text-violet-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-amber-950 sm:text-base">
            {form.watch("title") || quiz.title}
          </p>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
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
          onClick={() => {
            if (isMobile) setSidebarOpenMobile(false);
            else setSidebarOpen(false);
            setAiChatOpen(true);
          }}
          disabled={isSaving || isDeleting}
          className="gap-1.5"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">AI assistant</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={isSaving || isDeleting}
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
        {/* autosave status indicators disabled — re-enable with autosave hook */}
        {/* {autosaveStatus === "saving-db" && (
          <span className="hidden text-xs text-muted-foreground sm:inline">Sauvegarde...</span>
        )}
        {autosaveStatus === "saved" && (
          <span className="hidden text-xs text-green-600 sm:inline">Sauvegardé</span>
        )} */}
        <Button type="submit" disabled={isSaving || isDeleting} className="gap-1.5">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

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

      {/* ── Content area: bento grid + chat panel ─────────────── */}
      <div className="flex min-h-0 flex-1 gap-3 sm:gap-4">

      {/* ── Bento grid ────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* ── Left column: plan (TOC) + add-block + settings ── */}
        <div className="flex min-h-0 flex-col gap-3 sm:gap-4 lg:col-span-1">

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
                <Map className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                        <span className="truncate">{BLOCK_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-border pt-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Quiz blocks
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Weight: {totalWeight}
              </Badge>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
              blocks.map((block, idx) => (
                <div key={block.clientId} id={`block-${block.clientId}`}>
                <BlockWrapper
                  type={block.type}
                  index={idx}
                  total={blocks.length}
                  points={block.points}
                  error={blockErrors[block.clientId]}
                  onMoveToTop={() => moveBlockToTop(block.clientId)}
                  onMoveUp={() => moveBlock(block.clientId, "up")}
                  onMoveDown={() => moveBlock(block.clientId, "down")}
                  onMoveToBottom={() => moveBlockToBottom(block.clientId)}
                  onDuplicate={() => duplicateBlock(block.clientId)}
                  onRemove={() => removeBlock(block.clientId)}
                  onPointsChange={(p) => updateBlockPoints(block.clientId, p)}
                >
                  {renderBlockEditor(block)}
                </BlockWrapper>
                </div>
              ))
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
            />
          </div>
        </div>
      )}

      </div>{/* end content area */}
    </form>
  );
}

