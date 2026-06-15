"use client";

import { useEffect, useMemo, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

interface AudioLine {
  speaker: string;
  text: string;
  voice: string;
  audioUrl: string;
}

interface AudioEntry {
  kind: "sentence" | "conversation";
  key: string;
  hash?: string;
  text?: string;
  audioUrl?: string;
  lines?: AudioLine[];
}

interface RichTextViewerProps {
  content: string;
  className?: string;
  audioEntries?: AudioEntry[];
}

export function RichTextViewer({
  content,
  className,
  audioEntries,
}: RichTextViewerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const clean = useMemo(
    () =>
      DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "em", "u", "s",
          "h1", "h2", "h3", "h4", "h5", "h6",
          "ul", "ol", "li",
          "blockquote", "hr", "code", "pre",
          "a", "mark", "span", "div",
          "img",
        ],
        ALLOWED_ATTR: [
          "href", "target", "rel", "style", "class",
          "src", "alt", "title", "width", "height", "loading",
          "data-conversation", "data-voices",
        ],
      }),
    [content],
  );

  const sentenceUrlByText = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of audioEntries ?? []) {
      if (e.kind === "sentence" && e.text && e.audioUrl) {
        map.set(e.text, e.audioUrl);
      }
    }
    return map;
  }, [audioEntries]);

  const conversationLinesById = useMemo(() => {
    const map = new Map<string, AudioLine[]>();
    for (const e of audioEntries ?? []) {
      if (e.kind === "conversation" && e.lines && e.lines.length > 0) {
        map.set(e.key, e.lines);
      }
    }
    return map;
  }, [audioEntries]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    root.querySelectorAll("[data-lesson-audio-btn]").forEach((n) => n.remove());

    const normalize = (s: string): string =>
      s
        .replace(/ /g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // ── Conversations: one button on the <h3>, plays lines sequentially ──
    const conversationRoots = root.querySelectorAll<HTMLElement>(
      "[data-conversation]",
    );
    conversationRoots.forEach((conv) => {
      const id = conv.getAttribute("data-conversation") ?? "";
      const lines = conversationLinesById.get(id);
      if (!lines || lines.length === 0) return;

      const heading = conv.querySelector("h3");
      if (!heading) return;

      const wrap = document.createElement("span");
      wrap.className = "inline-flex items-center gap-2 align-middle";
      while (heading.firstChild) wrap.appendChild(heading.firstChild);
      wrap.appendChild(makeConversationPlayButton(lines));
      heading.appendChild(wrap);
    });

    // ── Standalone sentences in <blockquote>s ──
    root.querySelectorAll("blockquote").forEach((bq) => {
      if (bq.closest("[data-conversation]")) return;

      const groups: Node[][] = [];
      let current: Node[] = [];
      for (const child of Array.from(bq.childNodes)) {
        if (child.nodeName === "BR") {
          if (current.length > 0) groups.push(current);
          current = [];
        } else {
          current.push(child);
        }
      }
      if (current.length > 0) groups.push(current);
      if (groups.length === 0) return;

      bq.innerHTML = "";
      for (const group of groups) {
        const text = normalize(
          group.map((n) => (n as HTMLElement).textContent ?? "").join(""),
        );
        const row = document.createElement("div");
        row.className = "flex flex-wrap items-center gap-2";

        const textWrap = document.createElement("span");
        for (const node of group) textWrap.appendChild(node);
        row.appendChild(textWrap);

        const url = sentenceUrlByText.get(text);
        if (url) row.appendChild(makeSentencePlayButton(url));

        bq.appendChild(row);
      }
    });

    // ── Standalone "Speaker: line" paragraphs (outside conversations) ──
    root.querySelectorAll("p").forEach((p) => {
      if (p.closest("[data-conversation]")) return;
      const first = p.firstElementChild;
      if (!first || first.tagName !== "STRONG") return;
      const label = first.textContent ?? "";
      if (!/:\s*$/.test(label.trim())) return;
      const spoken = normalize(
        (p.textContent ?? "").slice((first.textContent ?? "").length),
      );
      const url = sentenceUrlByText.get(spoken);
      if (!url) return;
      p.appendChild(makeSentencePlayButton(url));
    });
  }, [clean, sentenceUrlByText, conversationLinesById]);

  return (
    <div
      ref={containerRef}
      className={cn("prose prose-sm max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

// ── Shared player state ─────────────────────────────────────────────────────

let currentAudio: HTMLAudioElement | null = null;
let currentButton: HTMLButtonElement | null = null;
// Cancellation token for the conversation sequence currently playing.
let currentToken = 0;

const PLAY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

function setButtonState(btn: HTMLButtonElement, playing: boolean): void {
  btn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
  btn.setAttribute(
    "aria-label",
    playing ? "Pause pronunciation" : "Play pronunciation",
  );
}

function stopCurrent(): void {
  currentToken += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (currentButton) setButtonState(currentButton, false);
  currentAudio = null;
  currentButton = null;
}

function baseButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("data-lesson-audio-btn", "");
  btn.className =
    "shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 bg-amber-50 align-middle text-amber-800 transition hover:bg-amber-100 print:hidden";
  setButtonState(btn, false);
  return btn;
}

// ── Single-sentence button ──────────────────────────────────────────────────

function makeSentencePlayButton(url: string): HTMLButtonElement {
  const btn = baseButton();
  btn.onclick = (e) => {
    e.preventDefault();

    if (currentButton === btn && currentAudio && !currentAudio.paused) {
      stopCurrent();
      return;
    }
    stopCurrent();

    const audio = new Audio(url);
    currentAudio = audio;
    currentButton = btn;
    setButtonState(btn, true);

    audio.onended = () => {
      if (currentButton === btn) {
        setButtonState(btn, false);
        currentAudio = null;
        currentButton = null;
      }
    };

    void audio.play().catch(() => {
      if (currentButton === btn) {
        setButtonState(btn, false);
        currentAudio = null;
        currentButton = null;
      }
    });
  };
  return btn;
}

// ── Multi-line conversation button ──────────────────────────────────────────

function makeConversationPlayButton(lines: AudioLine[]): HTMLButtonElement {
  const btn = baseButton();
  btn.onclick = async (e) => {
    e.preventDefault();

    if (currentButton === btn && currentAudio && !currentAudio.paused) {
      stopCurrent();
      return;
    }
    stopCurrent();

    const token = ++currentToken;
    currentButton = btn;
    setButtonState(btn, true);

    for (let i = 0; i < lines.length; i++) {
      if (token !== currentToken) return; // Cancelled mid-conversation.
      const line = lines[i]!;
      const audio = new Audio(line.audioUrl);
      currentAudio = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("audio error"));
          void audio.play().catch(reject);
        });
      } catch {
        break;
      }
    }

    if (token === currentToken) {
      setButtonState(btn, false);
      currentAudio = null;
      currentButton = null;
    }
  };
  return btn;
}
