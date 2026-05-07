"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import { FontSize } from "@/lib/extensions/font-size";
import { DiffDelete, DiffInsert } from "@/lib/extensions/diff-marks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Undo,
  Redo,
  Minus,
  Link2,
  X,
  Quote,
  Code,
  Highlighter,
  Palette,
} from "lucide-react";

const TEXT_COLORS = [
  { label: "Défaut", value: "" },
  { label: "Noir", value: "#000000" },
  { label: "Gris foncé", value: "#374151" },
  { label: "Gris", value: "#6B7280" },
  { label: "Rouge", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Jaune", value: "#EAB308" },
  { label: "Vert", value: "#22C55E" },
  { label: "Bleu", value: "#3B82F6" },
  { label: "Indigo", value: "#6366F1" },
  { label: "Violet", value: "#A855F7" },
  { label: "Rose", value: "#EC4899" },
] as const;

const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "36", value: "36px" },
  { label: "40", value: "40px" },
  { label: "48", value: "48px" },
] as const;

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  // Set → render this HTML read-only instead of `content` (AI diff preview).
  diffContent?: string | null;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
  diffContent,
}: RichTextEditorProps): React.JSX.Element | null {
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkHasSelection, setLinkHasSelection] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const isDiffMode = diffContent != null;
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  // Latest HTML the editor matches — used to skip echo emits.
  const lastSyncedHtml = useRef(content);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isDiffMode,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      DiffDelete,
      DiffInsert,
    ],
    content: isDiffMode ? diffContent : content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[150px] px-4 py-3 focus:outline-none",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      if (html === lastSyncedHtml.current) return;
      console.log(
        `[rich-text-editor] onUpdate | last="${lastSyncedHtml.current.slice(0, 80)}" → new="${html.slice(0, 80)}"`,
      );
      lastSyncedHtml.current = html;
      onChangeRef.current(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isDiffMode);
    const next = isDiffMode ? (diffContent ?? "") : content;
    if (editor.getHTML() === next) return;
    console.log(
      `[rich-text-editor] setContent | mode=${isDiffMode ? "diff" : "edit"} | from="${editor.getHTML().slice(0, 80)}" | to="${next.slice(0, 80)}"`,
    );
    editor.commands.setContent(next, { emitUpdate: false });
    // Snapshot what the editor actually shows after Tiptap normalizes the
    // HTML, so the next onUpdate (which may report this normalized form)
    // is treated as a no-op.
    lastSyncedHtml.current = editor.getHTML();
  }, [editor, content, diffContent, isDiffMode]);

  const openLinkMode = useCallback(() => {
    if (!editor) return;
    const onLink = editor.isActive("link");
    const hasSel = !editor.state.selection.empty;
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkText("");
    setLinkHasSelection(hasSel || onLink);
    setLinkMode(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      if (linkHasSelection) {
        editor.chain().focus().setLink({ href }).run();
      } else {
        const text = linkText.trim() || href;
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text,
            marks: [{ type: "link", attrs: { href } }],
          })
          .run();
      }
    }
    setLinkMode(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor, linkUrl, linkText, linkHasSelection]);

  const cancelLink = useCallback(() => {
    setLinkMode(false);
    setLinkUrl("");
    setLinkText("");
    editor?.commands.focus();
  }, [editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setColorPickerOpen(false);
      }
    };
    if (colorPickerOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerOpen]);

  if (!editor) return null;

  const isLinkActive = editor.isActive("link");
  const currentColor = editor.getAttributes("textStyle").color ?? "";

  return (
    <div
      className={cn(
        "rounded-lg border border-input bg-background overflow-hidden",
        className,
      )}
    >
      <TooltipProvider delay={500}>
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5 min-h-10.5">
          {/* Font size */}
          <Select
            value={editor.getAttributes("textStyle").fontSize ?? ""}
            onValueChange={(value) => {
              if (value === "default") {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(value).run();
              }
            }}
          >
            <SelectTrigger className="h-7 w-17.5 gap-1 border-none bg-transparent px-2 text-xs shadow-none">
              <SelectValue placeholder="Taille" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="default">Par défaut</SelectItem>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Gras"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italique"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Souligné"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive("paragraph")}
            title="Texte normal"
          >
            <Type className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
            title="Titre 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            title="Titre 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
            title="Titre 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 4 }).run()
            }
            active={editor.isActive("heading", { level: 4 })}
            title="Titre 4"
          >
            <Heading4 className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Aligner à gauche"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Centrer"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Aligner à droite"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Liste à puces"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Liste numérotée"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Citation"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Bloc de code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive("highlight")}
            title="Surligner"
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>

          {/* Color picker */}
          <div className="relative" ref={colorPickerRef}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 flex flex-col items-center justify-center gap-0"
                    onClick={() => setColorPickerOpen((o) => !o)}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span
                      className="h-1 w-4 rounded-sm"
                      style={{
                        backgroundColor: currentColor || "transparent",
                        border: currentColor
                          ? "none"
                          : "1px solid hsl(var(--border))",
                      }}
                    />
                  </Button>
                }
              />
              <TooltipContent>Couleur du texte</TooltipContent>
            </Tooltip>
            {colorPickerOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 rounded-md border border-border bg-popover px-6 py-3 shadow-md w-fit">
                <div className="grid grid-cols-4 gap-x-8 gap-y-2 place-items-center">
                  {TEXT_COLORS.map((c) => (
                    <Tooltip key={c.value || "default"}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              "block h-6 w-6 shrink-0 rounded border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring",
                              currentColor === c.value &&
                                "ring-2 ring-ring ring-offset-1",
                              !c.value &&
                                "relative after:absolute after:inset-0 after:m-auto after:h-px after:w-full after:rotate-45 after:bg-destructive after:content-['']",
                            )}
                            style={{ backgroundColor: c.value || "white" }}
                            onClick={() => {
                              if (c.value) {
                                editor.chain().focus().setColor(c.value).run();
                              } else {
                                editor.chain().focus().unsetColor().run();
                              }
                              setColorPickerOpen(false);
                            }}
                          />
                        }
                      />
                      <TooltipContent>{c.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mx-1 h-5 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 shrink-0",
                    isLinkActive && "bg-accent text-accent-foreground",
                  )}
                  onClick={openLinkMode}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Lien</TooltipContent>
          </Tooltip>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Séparateur"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </TooltipProvider>
      {linkMode && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          {!linkHasSelection && (
            <Input
              autoFocus
              className="h-7 w-32 text-sm"
              placeholder="Texte"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") cancelLink();
              }}
            />
          )}
          <Input
            autoFocus={linkHasSelection}
            className="h-7 flex-1 text-sm"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") cancelLink();
            }}
          />
          {isLinkActive && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setLinkMode(false);
              }}
            >
              Supprimer
            </button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={applyLink}
          >
            OK
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={cancelLink}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0",
              active && "bg-accent text-accent-foreground",
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
