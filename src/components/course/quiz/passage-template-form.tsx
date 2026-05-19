"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileQuestion,
  FileText,
  Headphones,
  ListChecks,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type PassageTemplateKind = "text" | "audio";

export interface PassageTemplateConfig {
  passageKind: PassageTemplateKind;
  mcqCount: number;
  fillBlankCount: number;
  caption: string;
}

interface PassageTemplateFormProps {
  onAdd: (config: PassageTemplateConfig) => void;
}

const MIN_QS = 0;
const MAX_QS = 10;
const DEFAULTS: PassageTemplateConfig = {
  passageKind: "text",
  mcqCount: 3,
  fillBlankCount: 0,
  caption: "",
};

export function PassageTemplateForm({
  onAdd,
}: PassageTemplateFormProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium text-amber-950 transition-colors hover:border-violet-500/50 hover:bg-violet-50"
        aria-expanded={open}
      >
        <FileQuestion className="h-3.5 w-3.5 shrink-0 text-violet-600" />
        <span className="flex-1">Passage + questions</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open ? <FormBody onAdd={onAdd} /> : null}
    </div>
  );
}

function FormBody({ onAdd }: PassageTemplateFormProps): React.JSX.Element {
  const [passageKind, setPassageKind] = useState<PassageTemplateKind>(
    DEFAULTS.passageKind,
  );
  const [mcqCount, setMcqCount] = useState<number>(DEFAULTS.mcqCount);
  const [fillBlankCount, setFillBlankCount] = useState<number>(
    DEFAULTS.fillBlankCount,
  );
  const [caption, setCaption] = useState<string>(DEFAULTS.caption);

  const clamp = (n: number): number =>
    Math.max(MIN_QS, Math.min(MAX_QS, Number.isFinite(n) ? n : 0));

  const handleAdd = (): void => {
    onAdd({
      passageKind,
      mcqCount: clamp(mcqCount),
      fillBlankCount: clamp(fillBlankCount),
      caption: caption.trim(),
    });
    setCaption("");
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-background p-2.5">
      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Passage type
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          <SegButton
            active={passageKind === "text"}
            onClick={() => setPassageKind("text")}
            icon={<FileText className="h-3 w-3" />}
            label="Text"
          />
          <SegButton
            active={passageKind === "audio"}
            onClick={() => setPassageKind("audio")}
            icon={<Headphones className="h-3 w-3" />}
            label="Audio"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Questions
        </Label>
        <div className="space-y-1.5">
          <QuestionRow
            icon={<ListChecks className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
            label="MCQ"
            value={mcqCount}
            onChange={setMcqCount}
            inputId="ptpl-mcq"
          />
          <QuestionRow
            icon={<Pencil className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
            label="Fill-blank"
            value={fillBlankCount}
            onChange={setFillBlankCount}
            inputId="ptpl-fillblank"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="ptpl-caption"
          className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Caption (optional)
        </Label>
        <Input
          id="ptpl-caption"
          placeholder="e.g. A short story about Sara"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <Button type="button" size="sm" onClick={handleAdd} className="w-full">
        Add passage + questions
      </Button>
    </div>
  );
}

interface QuestionRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (n: number) => void;
  inputId: string;
}

function QuestionRow({
  icon,
  label,
  value,
  onChange,
  inputId,
}: QuestionRowProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5">
      {icon}
      <Label
        htmlFor={inputId}
        className="flex-1 cursor-pointer text-xs font-medium text-amber-950"
      >
        {label}
      </Label>
      <Input
        id={inputId}
        type="number"
        min={MIN_QS}
        max={MAX_QS}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-14 text-center text-xs"
      />
    </div>
  );
}

interface SegButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function SegButton({
  active,
  onClick,
  icon,
  label,
}: SegButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-violet-500 bg-violet-50 text-violet-900"
          : "border-border bg-background text-amber-950 hover:border-violet-500/50 hover:bg-violet-50",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
