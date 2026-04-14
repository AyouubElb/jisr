"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  HelpCircle,
  ImageIcon,
  ListChecks,
  Music,
  Pencil,
  Plus,
  Save,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BlockWrapper,
  TextBlockEditor,
  McqBlockEditor,
  FillBlankBlockEditor,
  FreeTextBlockEditor,
  AudioBlockEditor,
  ImageBlockEditor,
} from "@/components/course/quiz-block-editor";
import {
  createQuizSchema,
  type CreateQuizInput,
  type BlockType,
  BLOCK_TYPE_LABELS,
} from "@/lib/schemas/quiz.schema";
import {
  useQuiz,
  useUpdateQuiz,
  useSaveQuizBlocks,
} from "@/lib/hooks/useQuizzes";

const AVAILABLE_BLOCK_TYPES: BlockType[] = [
  "text",
  "audio",
  "image",
  "mcq",
  "fill_blank",
  "free_text",
];

const BLOCK_TYPE_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  audio: Music,
  image: ImageIcon,
  mcq: ListChecks,
  fill_blank: Pencil,
  free_text: HelpCircle,
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
    text: { html: "" },
    audio: { audio_url: "", caption: "" },
    image: { image_url: "", alt: "" },
    mcq: { prompt: "", options: [] },
    fill_blank: { sentence: "", accepted_answers: [""] },
    free_text: { prompt: "", min_words: undefined },
  };
  const isQuestion =
    type === "mcq" || type === "fill_blank" || type === "free_text";

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
};

export default function QuizEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const quizId = params.quizId as string;

  const { data: quiz, isLoading } = useQuiz(quizId);
  const { mutate: updateQuiz, isPending: isUpdatingQuiz } = useUpdateQuiz(courseId);
  const { mutate: saveBlocks, isPending: isSavingBlocks } = useSaveQuizBlocks(courseId);

  const [blocks, setBlocks] = useState<LocalBlock[]>([]);

  const form = useForm({
    resolver: zodResolver(createQuizSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Hydrate form + blocks once quiz loads
  useEffect(() => {
    if (!quiz) return;
    form.reset({
      title: quiz.title,
      description: quiz.description ?? "",
      time_limit_minutes: quiz.time_limit_minutes,
    });
    setBlocks(
      quiz.quiz_blocks
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          clientId: b.id,
          type: b.type as BlockType,
          content: b.content as Record<string, unknown>,
          points: b.points,
          order: b.order,
        })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id]);

  // ── Block ops ────────────────────────────────────────────────────
  const addBlock = (type: BlockType): void => {
    setBlocks((prev) => [...prev, createEmptyBlock(type, prev.length)]);
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
  };

  const updateBlockPoints = (clientId: string, points: number | null): void => {
    setBlocks((prev) =>
      prev.map((b) => (b.clientId === clientId ? { ...b, points } : b)),
    );
  };

  // ── Save ─────────────────────────────────────────────────────────
  const onSave = (values: Record<string, unknown>): void => {
    const data = values as unknown as CreateQuizInput;
    const blockInserts = blocks.map((b) => ({
      type: b.type as "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text",
      content: b.content,
      points: b.points,
      order: b.order,
    }));

    updateQuiz(
      { id: quizId, updates: data },
      {
        onSuccess: () => {
          saveBlocks({ quizId, blocks: blockInserts });
        },
      },
    );
  };

  const isSaving = isUpdatingQuiz || isSavingBlocks;

  // ── Block renderer ───────────────────────────────────────────────
  const renderBlockEditor = (block: LocalBlock): React.JSX.Element | null => {
    switch (block.type) {
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
      default:
        return null;
    }
  };

  // ── Derived stats ────────────────────────────────────────────────
  const totalPoints = blocks
    .filter((b) => b.points !== null)
    .reduce((sum, b) => sum + (b.points ?? 0), 0);
  const questionCount = blocks.filter(
    (b) => b.type === "mcq" || b.type === "fill_blank" || b.type === "free_text",
  ).length;

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
        <p className="text-lg text-muted-foreground">Quiz introuvable</p>
        <Link href={`/instructor/courses/${courseId}`}>
          <Button variant="outline">Retour au cours</Button>
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
              {blocks.length} bloc{blocks.length !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>
              {questionCount} question{questionCount !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>{totalPoints} pts</span>
          </div>
        </div>
        <Button type="submit" disabled={isSaving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* ── Bento grid ────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* ── Left column: settings + add-block + stats ─────── */}
        <div className="flex min-h-0 flex-col gap-3 sm:gap-4 lg:col-span-1">
          {/* Settings card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Parametres
              </h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Titre</Label>
                <Input
                  placeholder="ex : Present Simple"
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
                  placeholder="Courte description..."
                  className="resize-none"
                  {...form.register("description")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duree limite (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  placeholder="Aucune"
                  {...form.register("time_limit_minutes", {
                    setValueAs: (v) =>
                      v === "" || v === null ? null : Number(v),
                  })}
                />
              </div>
            </div>
          </div>

          {/* Add-block panel */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Ajouter un bloc
              </h2>
            </div>
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
          </div>

          {/* Stats card — hidden on small screens to save space */}
          <div className="hidden flex-1 rounded-xl border border-border bg-gradient-to-br from-violet-50 to-amber-50/40 p-4 shadow-sm lg:block">
            <div className="mb-3 flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">Apercu</h2>
            </div>
            <div className="space-y-2.5">
              <StatRow label="Blocs" value={blocks.length.toString()} />
              <StatRow label="Questions" value={questionCount.toString()} />
              <StatRow label="Points totaux" value={totalPoints.toString()} />
              <StatRow
                label="Duree"
                value={
                  form.watch("time_limit_minutes")
                    ? `${form.watch("time_limit_minutes")} min`
                    : "—"
                }
              />
            </div>
          </div>
        </div>

        {/* ── Right column: blocks list (scrollable) ──────────── */}
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Blocs du quiz
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {blocks.length} bloc{blocks.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {totalPoints} pts
              </Badge>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {blocks.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-amber-950">
                  Aucun bloc pour le moment
                </p>
                <p className="text-xs text-muted-foreground">
                  Utilisez le panneau a gauche pour ajouter un bloc
                </p>
              </div>
            ) : (
              blocks.map((block, idx) => (
                <BlockWrapper
                  key={block.clientId}
                  type={block.type}
                  index={idx}
                  total={blocks.length}
                  points={block.points}
                  onMoveUp={() => moveBlock(block.clientId, "up")}
                  onMoveDown={() => moveBlock(block.clientId, "down")}
                  onDuplicate={() => duplicateBlock(block.clientId)}
                  onRemove={() => removeBlock(block.clientId)}
                  onPointsChange={(p) => updateBlockPoints(block.clientId, p)}
                >
                  {renderBlockEditor(block)}
                </BlockWrapper>
              ))
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-amber-950">{value}</span>
    </div>
  );
}
