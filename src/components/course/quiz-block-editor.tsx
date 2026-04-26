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
  ChevronsDown,
  ChevronsUp,
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
  error?: string;
  onMoveToTop: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToBottom: () => void;
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
  error,
  onMoveToTop,
  onMoveUp,
  onMoveDown,
  onMoveToBottom,
  onDuplicate,
  onRemove,
  onPointsChange,
  children,
}: BlockWrapperProps): React.JSX.Element {
  const isQuestion =
    type === "mcq" || type === "fill_blank" || type === "free_text";

  return (
    <div className={`rounded-lg border bg-card ${error ? "border-destructive" : "border-border"}`}>
      {/* Block header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {BLOCK_TYPE_LABELS[type]}
        </span>
        <span className="text-xs text-muted-foreground">#{index + 1}</span>

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
            title="Monter tout en haut"
            onClick={onMoveToTop}
          >
            <ChevronsUp className="h-3.5 w-3.5" />
          </Button>
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
            disabled={index === total - 1}
            title="Descendre tout en bas"
            onClick={onMoveToBottom}
          >
            <ChevronsDown className="h-3.5 w-3.5" />
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
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
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

// ── Section block editor ──────────────────────────────────────────────

interface SectionBlockEditorProps {
  content: { title?: string; description?: string };
  onChange: (content: { title: string; description?: string }) => void;
}

export function SectionBlockEditor({
  content,
  onChange,
}: SectionBlockEditorProps): React.JSX.Element {
  const title = content.title ?? "";
  const description = content.description ?? "";
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Titre de la section</Label>
        <Input
          value={title}
          onChange={(e) => onChange({ title: e.target.value, description })}
          placeholder="ex : Partie 1 — Vocabulaire"
        />
      </div>
      <div className="space-y-2">
        <Label>Description (optionnel)</Label>
        <Input
          value={description}
          onChange={(e) => onChange({ title, description: e.target.value })}
          placeholder="Consignes ou contexte pour cette section"
        />
      </div>
    </div>
  );
}

// ── MCQ block editor ──────────────────────────────────────────────────

interface McqBlockEditorProps {
  content: { prompt?: string; options?: McqOption[]; allow_multiple?: boolean };
  onChange: (content: {
    prompt: string;
    options: McqOption[];
    allow_multiple: boolean;
  }) => void;
}

export function McqBlockEditor({
  content,
  onChange,
}: McqBlockEditorProps): React.JSX.Element {
  const baseId = useId();
  const prompt = content.prompt ?? "";
  const options = content.options ?? [];
  const allowMultiple = content.allow_multiple ?? false;
  const isBinary = options.length <= 2;

  const emit = (next: {
    prompt?: string;
    options?: McqOption[];
    allow_multiple?: boolean;
  }): void => {
    onChange({
      prompt: next.prompt ?? prompt,
      options: next.options ?? options,
      allow_multiple: next.allow_multiple ?? allowMultiple,
    });
  };

  const updatePrompt = (p: string): void => emit({ prompt: p });

  const addOption = (): void => {
    const newOption: McqOption = {
      id: `${baseId}-${Date.now()}`,
      label: "",
      is_correct: false,
    };
    emit({ options: [...options, newOption] });
  };

  const updateOption = (idx: number, patch: Partial<McqOption>): void => {
    const updated = options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    emit({ options: updated });
  };

  const toggleCorrect = (idx: number): void => {
    const target = options[idx];
    if (!target) return;
    if (allowMultiple) {
      updateOption(idx, { is_correct: !target.is_correct });
    } else {
      // Single-correct mode: mark this one correct, force all others to false
      const updated = options.map((o, i) => ({
        ...o,
        is_correct: i === idx ? !o.is_correct : false,
      }));
      emit({ options: updated });
    }
  };

  const toggleMode = (multiple: boolean): void => {
    if (!multiple) {
      // Switching single→multi is safe; multi→single must keep at most one correct
      const correctIdx = options.findIndex((o) => o.is_correct);
      const normalized = options.map((o, i) => ({
        ...o,
        is_correct: i === correctIdx,
      }));
      onChange({ prompt, options: normalized, allow_multiple: false });
    } else {
      onChange({ prompt, options, allow_multiple: true });
    }
  };

  const removeOption = (idx: number): void => {
    emit({ options: options.filter((_, i) => i !== idx) });
  };

  const correctCount = options.filter((o) => o.is_correct).length;

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

      {/* Mode toggle — hidden for binary (2-option) choices like Vrai/Faux */}
      {!isBinary && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
          <div className="flex flex-col">
            <span className="text-xs font-medium">Plusieurs bonnes reponses</span>
            <span className="text-[11px] text-muted-foreground">
              {allowMultiple
                ? "Toutes les bonnes options doivent etre cochees"
                : "Une seule bonne reponse"}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allowMultiple}
            onClick={() => toggleMode(!allowMultiple)}
            className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${
              allowMultiple ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                allowMultiple ? "-translate-x-3" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Options</Label>
          <span className="text-xs text-muted-foreground">
            {allowMultiple
              ? `${correctCount} bonne${correctCount !== 1 ? "s" : ""} reponse${correctCount !== 1 ? "s" : ""}`
              : correctCount === 1
                ? "1 bonne reponse"
                : "Aucune bonne reponse selectionnee"}
          </span>
        </div>
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              type="button"
              className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors ${
                allowMultiple ? "rounded" : "rounded-full"
              } ${
                opt.is_correct
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onClick={() => toggleCorrect(idx)}
              title={
                opt.is_correct ? "Reponse correcte" : "Marquer comme correcte"
              }
            >
              {opt.is_correct && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <Input
              className="flex-1"
              value={opt.label}
              onChange={(e) => updateOption(idx, { label: e.target.value })}
              placeholder={`Option ${idx + 1}`}
            />
            {!isBinary && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeOption(idx)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        {!isBinary && (
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
        )}
      </div>
    </div>
  );
}

// ── Fill-in-the-blank editor ──────────────────────────────────────────

interface FillBlankBlockEditorProps {
  content: { sentence?: string; options?: McqOption[] };
  onChange: (content: { sentence: string; options: McqOption[] }) => void;
}

export function FillBlankBlockEditor({
  content,
  onChange,
}: FillBlankBlockEditorProps): React.JSX.Element {
  const baseId = useId();
  const sentence = content.sentence ?? "";
  const options = content.options ?? [];

  const emit = (next: { sentence?: string; options?: McqOption[] }): void => {
    onChange({
      sentence: next.sentence ?? sentence,
      options: next.options ?? options,
    });
  };

  const addOption = (): void => {
    emit({
      options: [
        ...options,
        { id: `${baseId}-${Date.now()}`, label: "", is_correct: false },
      ],
    });
  };

  const updateOption = (idx: number, patch: Partial<McqOption>): void => {
    emit({ options: options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) });
  };

  const toggleCorrect = (idx: number): void => {
    // Single-correct: selecting one deselects all others
    emit({
      options: options.map((o, i) => ({ ...o, is_correct: i === idx })),
    });
  };

  const removeOption = (idx: number): void => {
    emit({ options: options.filter((_, i) => i !== idx) });
  };

  const correctCount = options.filter((o) => o.is_correct).length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Phrase (utilisez ___ pour le trou)</Label>
        <Input
          value={sentence}
          onChange={(e) => emit({ sentence: e.target.value })}
          placeholder="ex : The cat ___ on the mat yesterday."
        />
        <p className="text-xs text-muted-foreground">
          Utilisez trois tirets bas ___ pour indiquer le trou a remplir
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Choix de mots</Label>
          <span className="text-xs text-muted-foreground">
            {correctCount === 1
              ? "1 bonne reponse"
              : "Aucune bonne reponse selectionnee"}
          </span>
        </div>
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              type="button"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                opt.is_correct
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onClick={() => toggleCorrect(idx)}
              title={opt.is_correct ? "Bonne reponse" : "Marquer comme correcte"}
            >
              {opt.is_correct && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <Input
              className="flex-1"
              value={opt.label}
              onChange={(e) => updateOption(idx, { label: e.target.value })}
              placeholder={`Choix ${idx + 1}`}
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
          Ajouter un choix
        </Button>
      </div>
    </div>
  );
}

// ── Free text editor ──────────────────────────────────────────────────

interface FreeTextBlockEditorProps {
  content: { prompt?: string; min_words?: number; max_words?: number };
  onChange: (content: {
    prompt: string;
    min_words?: number;
    max_words?: number;
  }) => void;
}

export function FreeTextBlockEditor({
  content,
  onChange,
}: FreeTextBlockEditorProps): React.JSX.Element {
  const prompt = content.prompt ?? "";
  const minWords = content.min_words;
  const maxWords = content.max_words;

  const emit = (next: {
    prompt?: string;
    min_words?: number;
    max_words?: number;
  }): void => {
    onChange({
      prompt: next.prompt ?? prompt,
      min_words: "min_words" in next ? next.min_words : minWords,
      max_words: "max_words" in next ? next.max_words : maxWords,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Consigne</Label>
        <Input
          value={prompt}
          onChange={(e) => emit({ prompt: e.target.value })}
          placeholder="ex : Write a paragraph about your daily routine."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Minimum de mots (optionnel)</Label>
          <Input
            type="number"
            min={0}
            value={minWords ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              emit({ min_words: v === "" ? undefined : Number(v) });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Maximum de mots (optionnel)</Label>
          <Input
            type="number"
            min={0}
            value={maxWords ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              emit({ max_words: v === "" ? undefined : Number(v) });
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Cette question sera corrigee manuellement par l&apos;instructeur.
      </p>
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
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";

    setIsUploading(true);
    try {
      const path = await materialsApi.uploadQuizMedia(file, {
        courseId,
        quizId,
      });
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
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";

    setIsUploading(true);
    try {
      const path = await materialsApi.uploadQuizMedia(file, {
        courseId,
        quizId,
      });
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

// ── Voice block (student records audio response — manually graded) ────

interface VoiceBlockEditorProps {
  content: { prompt?: string; max_duration_seconds?: number };
  onChange: (content: { prompt: string; max_duration_seconds: number }) => void;
}

export function VoiceBlockEditor({
  content,
  onChange,
}: VoiceBlockEditorProps): React.JSX.Element {
  const prompt = content.prompt ?? "";
  const maxDuration = content.max_duration_seconds ?? 120;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Consigne</Label>
        <Input
          value={prompt}
          onChange={(e) =>
            onChange({
              prompt: e.target.value,
              max_duration_seconds: maxDuration,
            })
          }
          placeholder="ex : Presentez-vous en 1 minute"
        />
      </div>
      <div className="space-y-2">
        <Label>Duree maximum (secondes)</Label>
        <Input
          type="number"
          min={10}
          max={600}
          value={maxDuration}
          onChange={(e) =>
            onChange({
              prompt,
              max_duration_seconds: Number(e.target.value) || 120,
            })
          }
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Entre 10 et 600 secondes. Cette question sera corrigee manuellement.
        </p>
      </div>
    </div>
  );
}
