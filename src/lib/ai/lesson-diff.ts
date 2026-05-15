import { diff_match_patch } from "diff-match-patch";
import { parse, HTMLElement, NodeType, type Node } from "node-html-parser";

// Block-level HTML diff. Splits each side into top-level blocks, diffs them
// as units, wraps changed blocks' text in <span data-diff="del"|"ins">.
// Walks a real parsed tree — never regex on HTML, which cuts nested
// <blockquote>/<li> in half and produces unbalanced markup.

// ── tree helpers ─────────────────────────────────────────────────────────

const isElement = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;
const isTextNode = (n: Node): boolean => n.nodeType === NodeType.TEXT_NODE;

// Empty = no visible text and no real child element (a lone <br> doesn't count).
const isEmptyBlock = (el: HTMLElement): boolean => {
  if (el.text.trim().length > 0) return false;
  const hasRealChild = el.childNodes.some(
    (c) => isElement(c) && (c as HTMLElement).tagName !== "BR",
  );
  return !hasRealChild;
};

// Wrap every non-whitespace text node in a data-diff span. Rebuilds each
// element's content (text nodes have no replaceWith — only elements do).
const wrapTextNodes = (el: HTMLElement, kind: "del" | "ins"): void => {
  for (const child of el.childNodes) {
    if (isElement(child)) wrapTextNodes(child, kind);
  }
  let touched = false;
  const rebuilt = el.childNodes
    .map((child) => {
      if (!isTextNode(child)) return child.toString();
      const text = child.rawText;
      if (text.trim().length === 0) return text;
      touched = true;
      return `<span data-diff="${kind}">${text}</span>`;
    })
    .join("");
  if (touched) el.set_content(rebuilt);
};

// ── public: apply an accept/reject decision to diff-marked HTML ──────────

// Accept = drop deletions, unwrap insertions. Reject = the opposite.
export const applyDiffDecision = (
  diffHtml: string,
  decision: "accept" | "reject",
): string => {
  const drop = decision === "accept" ? "del" : "ins";
  const keep = decision === "accept" ? "ins" : "del";

  const root = parse(diffHtml);

  for (const span of root.querySelectorAll(`span[data-diff="${drop}"]`)) {
    span.remove();
  }
  for (const span of root.querySelectorAll(`span[data-diff="${keep}"]`)) {
    span.replaceWith(parse(span.innerHTML));
  }

  // Prune blocks emptied by a stripped deletion. Loop until stable so an
  // emptied inner block also clears its now-childless wrapper.
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const el of root.querySelectorAll("p,h1,h2,h3,h4,h5,h6,blockquote,li,ul,ol,pre")) {
      if (isEmptyBlock(el)) {
        el.remove();
        pruned = true;
      }
    }
  }

  return root.toString();
};

// ── block splitting ──────────────────────────────────────────────────────

// Split HTML into top-level block units — each a balanced outerHTML string.
// <ul>/<ol> stays whole as one block (its items diff together).
const splitBlocks = (html: string): string[] => {
  if (!html.trim()) return [];
  const root = parse(html);
  const blocks: string[] = [];
  for (const node of root.childNodes) {
    if (isElement(node)) {
      blocks.push(node.toString());
    } else if (isTextNode(node)) {
      const text = node.rawText.trim();
      if (text.length > 0) blocks.push(text);
    }
  }
  return blocks;
};

// Map each unique block to a code point so diff_match_patch runs at block
// granularity. Same trick its line-mode uses.
const blocksToChars = (
  s1: string[],
  s2: string[],
): { chars1: string; chars2: string; blockArray: string[] } => {
  const blockArray: string[] = [""];
  const blockHash = new Map<string, number>();
  const munge = (arr: string[]): string => {
    let out = "";
    for (const s of arr) {
      let n = blockHash.get(s);
      if (n === undefined) {
        blockArray.push(s);
        n = blockArray.length - 1;
        blockHash.set(s, n);
      }
      out += String.fromCharCode(n);
    }
    return out;
  };
  return { chars1: munge(s1), chars2: munge(s2), blockArray };
};

// Wrap every text node inside one block's HTML with a data-diff span.
// Exported so the op-driven diff (lesson-blocks.ts) can reuse it.
export const wrapBlockTextWith = (blockHtml: string, kind: "del" | "ins"): string => {
  const root = parse(blockHtml);
  wrapTextNodes(root, kind);
  return root.toString();
};

// ── public: build diff-marked HTML from old + new ────────────────────────

export const buildDiffHtml = (oldHtml: string, newHtml: string): string => {
  if (oldHtml === newHtml) return newHtml;

  const oldBlocks = splitBlocks(oldHtml);
  const newBlocks = splitBlocks(newHtml);

  if (oldBlocks.length === 0) {
    return newBlocks.map((b) => wrapBlockTextWith(b, "ins")).join("");
  }
  if (newBlocks.length === 0) {
    return oldBlocks.map((b) => wrapBlockTextWith(b, "del")).join("");
  }

  const dmp = new diff_match_patch();
  const { chars1, chars2, blockArray } = blocksToChars(oldBlocks, newBlocks);
  const diffs = dmp.diff_main(chars1, chars2, false);
  dmp.diff_cleanupSemantic(diffs);

  const out: string[] = [];
  let pendingDels: string[] = [];

  const flushDels = (): void => {
    if (pendingDels.length === 0) return;
    for (const block of pendingDels) {
      out.push(wrapBlockTextWith(block, "del"));
    }
    pendingDels = [];
  };

  for (const [op, chars] of diffs) {
    for (const ch of chars) {
      const block = blockArray[ch.charCodeAt(0)];
      if (op === -1) {
        pendingDels.push(block);
      } else if (op === 1) {
        flushDels();
        out.push(wrapBlockTextWith(block, "ins"));
      } else {
        flushDels();
        out.push(block);
      }
    }
  }
  flushDels();

  return out.join("");
};
