"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  BLOCK_TYPE_LABELS,
  type BlockType,
  type McqOption,
} from "@/lib/schemas/quiz.schema";
import { materialsApi } from "@/lib/api/materials.api";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  ImageIcon,
  Loader2,
  Music,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

// ── Shared block wrapper ──────────────────────────────────────────────

interface BlockWrapperProps {
  type: BlockType;
  index: number;
  total: number;
  points: number | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onPointsChange: (p: number | null) => void;
  children: React.ReactNode;
}

export function BlockWrapper({
  type,
  index,
  total,
  points,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onPointsChange,
  children,
}: BlockWrapperProps): React.JSX.Element {
  const isQuestion = type === "mcq" || type === "fill_blank" || type === "free_text";

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Block header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {BLOCK_TYPE_LABELS[type]}
        </span>
        <span className="text-xs text-muted-foreground">
          #{index + 1}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isQuestion && (
            <div className="flex items-center gap-1 mr-2">
              <Label className="text-xs text-muted-foreground">Pts</Label>
              <Input
                type="number"
                min={0}
                className="h-7 w-14 text-xs"
                value={points ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onPointsChange(v === "" ? null : Number(v));
                }}
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Dupliquer le bloc"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Block content */}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Text block editor ─────────────────────────────────────────────────

interface TextBlockEditorProps {
  content: { html?: string };
  onChange: (content: { html: string }) => void;
}

export function TextBlockEditor({
  content,
  onChange,
}: TextBlockEditorProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>Contenu du passage</Label>
      <RichTextEditor
        content={content.html ?? ""}
        onChange={(html) => onChange({ html })}
        placeholder="Ecrivez un passage, des instructions..."
      />
    </div>
  );
}

// ── MCQ block editor ──────────────────────────────────────────────────

interface McqBlockEditorProps {
  content: { prompt?: string; options?: McqOption[] };
  onChange: (content: { prompt: string; options: McqOption[] }) => void;
}

export function McqBlockEditor({
  content,
  onChange,
}: McqBlockEditorProps): React.JSX.Element {
  const baseId = useId();
  const prompt = content.prompt ?? "";
  const options = content.options ?? [];

  const updatePrompt = (p: string): void => {
    onChange({ prompt: p, options });
  };

  const addOption = (): void => {
    const newOption: McqOption = {
      id: `${baseId}-${Date.now()}`,
      label: "",
      is_correct: false,
    };
    onChange({ prompt, options: [...options, newOption] });
  };

  const updateOption = (idx: number, patch: Partial<McqOption>): void => {
    const updated = options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    onChange({ prompt, options: updated });
  };

  const removeOption = (idx: number): void => {
    onChange({ prompt, options: options.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question</Label>
        <Input
          value={prompt}
          onChange={(e) => updatePrompt(e.target.value)}
          placeholder="ex : What is the past tense of 'go'?"
        />
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              type="button"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                opt.is_correct
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-muted-foreground/30 hover:border-green-600/50"
              }`}
              onClick={() => updateOption(idx, { is_correct: !opt.is_correct })}
              title={opt.is_correct ? "Reponse correcte" : "Marquer comme correcte"}
            >
              {opt.is_correct && <Check className="h-3.5 w-3.5" />}
            </button>
            <Input
              className="flex-1"
              value={opt.label}
              onChange={(e) => updateOption(idx, { label: e.target.value })}
              placeholder={`Option ${idx + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeOption(idx)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une option
        </Button>
      </div>
    </div>
  );
}

// ── Fill-in-the-blank editor ──────────────────────────────────────────

interface FillBlankBlockEditorProps {
  content: { sentence?: string; accepted_answers?: string[] };
  onChange: (content: { sentence: string; accepted_answers: string[] }) => void;
}

export function FillBlankBlockEditor({
  content,
  onChange,
}: FillBlankBlockEditorProps): React.JSX.Element {
  const sentence = content.sentence ?? "";
  const answers = content.accepted_answers ?? [""];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Phrase (utilisez ___ pour le trou)</Label>
        <Input
          value={sentence}
          onChange={(e) => onChange({ sentence: e.target.value, accepted_answers: answers })}
          placeholder="ex : The cat ___ on the mat yesterday."
        />
        <p className="text-xs text-muted-foreground">
          Utilisez trois tirets bas ___ pour indiquer le trou a remplir
        </p>
      </div>

      <div className="space-y-2">
        <Label>Reponses acceptees</Label>
        {answers.map((ans, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              className="flex-1"
              value={ans}
              onChange={(e) => {
                const updated = [...answers];
                updated[idx] = e.target.value;
                onChange({ sentence, accepted_answers: updated });
              }}
              placeholder={`Reponse ${idx + 1}`}
            />
            {answers.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  onChange({
                    sentence,
                    accepted_answers: answers.filter((_, i) => i !== idx),
                  })
                }
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ sentence, accepted_answers: [...answers, ""] })
          }
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une reponse
        </Button>
      </div>
    </div>
  );
}

// ── Free text editor ──────────────────────────────────────────────────

interface FreeTextBlockEditorProps {
  content: { prompt?: string; min_words?: number };
  onChange: (content: { prompt: string; min_words?: number }) => void;
}

export function FreeTextBlockEditor({
  content,
  onChange,
}: FreeTextBlockEditorProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Consigne</Label>
        <Input
          value={content.prompt ?? ""}
          onChange={(e) =>
            onChange({ prompt: e.target.value, min_words: content.min_words })
          }
          placeholder="ex : Write a paragraph about your daily routine."
        />
      </div>
      <div className="space-y-2">
        <Label>Nombre minimum de mots (optionnel)</Label>
        <Input
          type="number"
          min={0}
          className="w-32"
          value={content.min_words ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              prompt: content.prompt ?? "",
              min_words: v === "" ? undefined : Number(v),
            });
          }}
        />
      </div>
    </div>
  );
}

// ── Audio block editor ──────────────────────────────────────────────

interface AudioBlockEditorProps {
  content: { audio_url?: string; caption?: string };
  onChange: (content: { audio_url: string; caption?: string }) => void;
  courseId: string;
  quizId: string;
}

export function AudioBlockEditor({
  content,
  onChange,
  courseId,
  quizId,
}: AudioBlockEditorProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const storagePath = content.audio_url ?? "";

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [storagePath]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";

    setIsUploading(true);
    try {
      const path = await materialsApi.uploadQuizMedia(file, { courseId, quizId });
      onChange({ audio_url: path, caption: content.caption });
    } catch {
      // toast is shown by the caller layer if needed
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fichier audio</Label>
        {storagePath ? (
          <div className="space-y-2">
            {signedUrl && (
              <audio controls className="w-full">
                <source src={signedUrl} />
              </audio>
            )}
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <Music className="h-4 w-4 shrink-0 text-violet-500" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {storagePath.split("/").pop()}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                Remplacer
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Choisir un fichier audio
              </>
            )}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.m4a,.aac,.webm"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="space-y-2">
        <Label>Legende (optionnel)</Label>
        <Input
          value={content.caption ?? ""}
          onChange={(e) =>
            onChange({ audio_url: storagePath, caption: e.target.value })
          }
          placeholder="ex : Ecoutez le dialogue et repondez aux questions"
        />
      </div>
    </div>
  );
}

// ── Image block editor ──────────────────────────────────────────────

interface ImageBlockEditorProps {
  content: { image_url?: string; alt?: string };
  onChange: (content: { image_url: string; alt?: string }) => void;
  courseId: string;
  quizId: string;
}

export function ImageBlockEditor({
  content,
  onChange,
  courseId,
  quizId,
}: ImageBlockEditorProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const storagePath = content.image_url ?? "";

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    materialsApi.getSignedUrl(storagePath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [storagePath]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";

    setIsUploading(true);
    try {
      const path = await materialsApi.uploadQuizMedia(file, { courseId, quizId });
      onChange({ image_url: path, alt: content.alt });
    } catch {
      // toast is shown by the caller layer if needed
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image</Label>
        {storagePath ? (
          <div className="space-y-2">
            {signedUrl && (
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  src={signedUrl}
                  alt={content.alt ?? ""}
                  className="max-h-64 w-full object-contain bg-muted/20"
                />
              </div>
            )}
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {storagePath.split("/").pop()}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                Remplacer
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Choisir une image
              </>
            )}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="space-y-2">
        <Label>Texte alternatif (optionnel)</Label>
        <Input
          value={content.alt ?? ""}
          onChange={(e) =>
            onChange({ image_url: storagePath, alt: e.target.value })
          }
          placeholder="ex : Image d'un dialogue dans un restaurant"
        />
      </div>
    </div>
  );
}
