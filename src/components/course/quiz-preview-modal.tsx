"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuiz } from "@/lib/hooks/useQuizzes";
import { materialsApi } from "@/lib/api/materials.api";
import type { BlockType } from "@/lib/schemas/quiz.schema";
import {
  Circle,
  Clock,
  ImageIcon,
  Music,
} from "lucide-react";

interface QuizPreviewModalProps {
  quizId: string | null;
  onClose: () => void;
}

export function QuizPreviewModal({
  quizId,
  onClose,
}: QuizPreviewModalProps): React.JSX.Element | null {
  const { data: quiz, isLoading } = useQuiz(quizId ?? "");

  if (!quizId) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] sm:max-w-2xl lg:max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {isLoading || !quiz ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg">
                  {quiz.title}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px]">
                  Apercu etudiant
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {quiz.time_limit_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {quiz.time_limit_minutes} min
                  </span>
                )}
                <span>
                  {quiz.quiz_blocks.filter((b) =>
                    b.type === "mcq" ||
                    b.type === "fill_blank" ||
                    b.type === "free_text" ||
                    b.type === "voice"
                  ).length} question(s)
                </span>
                <span>Note sur 100</span>
              </div>
              {quiz.description && (
                <p className="text-sm text-muted-foreground">{quiz.description}</p>
              )}
            </DialogHeader>

            {/* Blocks */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {quiz.quiz_blocks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Ce quiz ne contient aucun bloc.
                </div>
              ) : (
                <div className="space-y-5">
                  {quiz.quiz_blocks
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((block, idx) => (
                      <BlockViewer
                        key={block.id}
                        type={block.type as BlockType}
                        content={block.content as Record<string, unknown>}
                        points={block.weight !== null ? Number(block.weight) : null}
                        index={idx}
                      />
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Block viewer (student perspective) ───────────────────────────────

function BlockViewer({
  type,
  content,
  points,
  index,
}: {
  type: BlockType;
  content: Record<string, unknown>;
  points: number | null;
  index: number;
}): React.JSX.Element {
  const isQuestion = type === "mcq" || type === "fill_blank" || type === "free_text";

  return (
    <div className="rounded-lg border border-border bg-card">
      {isQuestion && (
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Question {index + 1}
          </span>
          {points !== null && (
            <span className="text-xs text-muted-foreground">
              {points} pt{points !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        {type === "text" && <TextBlockViewer content={content} />}
        {type === "audio" && <AudioBlockViewer content={content} />}
        {type === "image" && <ImageBlockViewer content={content} />}
        {type === "mcq" && <McqBlockViewer content={content} />}
        {type === "fill_blank" && <FillBlankBlockViewer content={content} />}
        {type === "free_text" && <FreeTextBlockViewer content={content} />}
      </div>
    </div>
  );
}

// ── Individual block viewers ─────────────────────────────────────────

function TextBlockViewer({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const html = (content.html as string) || "";
  if (!html) {
    return (
      <p className="text-sm italic text-muted-foreground">Passage vide</p>
    );
  }
  return <RichTextViewer content={html} />;
}

function AudioBlockViewer({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const storagePath = (content.audio_url as string) || "";
  const caption = (content.caption as string) || "";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [storagePath]);

  if (!storagePath) {
    return (
      <div className="flex items-center gap-2 text-sm italic text-muted-foreground">
        <Music className="h-4 w-4" />
        Aucun audio
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {caption && (
        <p className="text-sm font-medium text-amber-950">{caption}</p>
      )}
      {signedUrl ? (
        <audio controls className="w-full">
          <source src={signedUrl} />
        </audio>
      ) : (
        <Skeleton className="h-12 w-full rounded-lg" />
      )}
    </div>
  );
}

function ImageBlockViewer({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const storagePath = (content.image_url as string) || "";
  const alt = (content.alt as string) || "";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [storagePath]);

  if (!storagePath) {
    return (
      <div className="flex items-center gap-2 text-sm italic text-muted-foreground">
        <ImageIcon className="h-4 w-4" />
        Aucune image
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signedUrl ? (
        <img
          src={signedUrl}
          alt={alt}
          className="max-h-80 w-full rounded-lg border border-border object-contain bg-muted/10"
        />
      ) : (
        <Skeleton className="h-48 w-full rounded-lg" />
      )}
      {alt && (
        <p className="text-xs text-muted-foreground">{alt}</p>
      )}
    </div>
  );
}

function McqBlockViewer({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  const options = (content.options as { id: string; label: string; is_correct: boolean }[]) || [];

  return (
    <div className="space-y-3">
      {prompt && (
        <p className="text-sm font-medium text-amber-950">{prompt}</p>
      )}
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-default items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <span className="text-sm">{opt.label || "..."}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FillBlankBlockViewer({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const sentence = (content.sentence as string) || "";
  const parts = sentence.split("___");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 text-sm leading-relaxed">
        {parts.map((part, idx) => (
          <span key={idx} className="inline-flex items-center gap-1">
            <span>{part}</span>
            {idx < parts.length - 1 && (
              <Input
                disabled
                className="inline-block h-8 w-32 text-center text-sm"
                placeholder="..."
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function FreeTextBlockViewer({ content }: { content: Record<string, unknown> }): React.JSX.Element {
  const prompt = (content.prompt as string) || "";
  const minWords = content.min_words as number | undefined;

  return (
    <div className="space-y-3">
      {prompt && (
        <p className="text-sm font-medium text-amber-950">{prompt}</p>
      )}
      <Textarea
        disabled
        rows={4}
        placeholder="L'etudiant ecrira sa reponse ici..."
        className="resize-none"
      />
      {minWords && (
        <p className="text-xs text-muted-foreground">
          Minimum {minWords} mot{minWords !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
