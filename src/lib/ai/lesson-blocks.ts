import { parse, HTMLElement, NodeType, type Node } from "node-html-parser";
import type { AILessonBlockChange } from "./schemas/lesson-edit.schema";
import { wrapBlockTextWith } from "./lesson-diff";

// Block-addressable lesson HTML. The edit agent picks block numbers from a
// list and emits ops — it never retypes the whole lesson. Tree-walk only.

const isElement = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;

// One top-level block: stable list position + balanced outerHTML.
export interface LessonBlock {
  index: number;
  html: string;
}

// Split lesson HTML into numbered top-level blocks (<ul>/<ol> stays whole).
// Loose text is wrapped in <p> so every block is a real element.
export const splitLessonBlocks = (html: string): LessonBlock[] => {
  if (!html.trim()) return [];
  const root = parse(html);
  const blocks: LessonBlock[] = [];
  for (const node of root.childNodes) {
    if (isElement(node)) {
      blocks.push({ index: blocks.length, html: node.toString() });
    } else if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.rawText.trim();
      if (text.length > 0) {
        blocks.push({ index: blocks.length, html: `<p>${text}</p>` });
      }
    }
  }
  return blocks;
};

// Render blocks as a numbered list for the prompt.
export const renderNumberedBlocks = (blocks: LessonBlock[]): string =>
  blocks.map((b) => `[${b.index}] ${b.html}`).join("\n");

// ── change ops ───────────────────────────────────────────────────────────
// Op shape is defined + validated by aiLessonEditOutputSchema. The ops:
//   replace      — swap block N's HTML.
//   insert_after — new block after block N (N = -1 → at the start). Multiple
//                  inserts on the same anchor keep array order.
//   delete       — remove block N.

export interface ApplyResult {
  html: string;
  changedBlocks: number[];
  insertedAfter: number[];
}

// Generator maps this to a repair retry instead of applying a broken edit.
export class LessonBlockApplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonBlockApplyError";
  }
}

// Apply a change list in ONE pass. The model only references original block
// numbers — this owns all the position math. Throws on out-of-range blocks
// or conflicting ops (replace + delete on the same block).
export const applyBlockChanges = (
  blocks: LessonBlock[],
  changes: AILessonBlockChange[],
): ApplyResult => {
  const maxIndex = blocks.length - 1;

  const replaceMap = new Map<number, string>();
  const deleteSet = new Set<number>();
  const insertMap = new Map<number, string[]>();

  for (const change of changes) {
    if (change.op === "insert_after") {
      if (change.block < -1 || change.block > maxIndex) {
        throw new LessonBlockApplyError(
          `insert_after references block ${change.block}, valid range is -1..${maxIndex}`,
        );
      }
      const list = insertMap.get(change.block) ?? [];
      list.push(change.html);
      insertMap.set(change.block, list);
      continue;
    }

    if (change.block < 0 || change.block > maxIndex) {
      throw new LessonBlockApplyError(
        `${change.op} references block ${change.block}, valid range is 0..${maxIndex}`,
      );
    }
    if (replaceMap.has(change.block) || deleteSet.has(change.block)) {
      throw new LessonBlockApplyError(
        `conflicting ops on block ${change.block} — only one replace or delete per block`,
      );
    }
    if (change.op === "replace") {
      replaceMap.set(change.block, change.html);
    } else {
      deleteSet.add(change.block);
    }
  }

  const out: string[] = [];
  const changedBlocks: number[] = [];
  const insertedAfter: number[] = [];

  // Inserts anchored at -1 come before block 0.
  const startInserts = insertMap.get(-1);
  if (startInserts) {
    out.push(...startInserts);
    insertedAfter.push(-1);
  }

  for (const block of blocks) {
    if (deleteSet.has(block.index)) {
      changedBlocks.push(block.index);
    } else if (replaceMap.has(block.index)) {
      out.push(replaceMap.get(block.index)!);
      changedBlocks.push(block.index);
    } else {
      out.push(block.html);
    }
    const inserts = insertMap.get(block.index);
    if (inserts) {
      out.push(...inserts);
      insertedAfter.push(block.index);
    }
  }

  return { html: out.join(""), changedBlocks, insertedAfter };
};

// Build diff HTML directly from the ops — no comparison guessing, no
// diff-match-patch. The ops are ground truth: replace = del(old)+ins(new),
// delete = del(old), insert_after = ins(new), untouched = verbatim.
export const buildDiffHtmlFromOps = (
  blocks: LessonBlock[],
  changes: AILessonBlockChange[],
): string => {
  const replaceMap = new Map<number, string>();
  const deleteSet = new Set<number>();
  const insertMap = new Map<number, string[]>();

  for (const change of changes) {
    if (change.op === "insert_after") {
      const list = insertMap.get(change.block) ?? [];
      list.push(change.html);
      insertMap.set(change.block, list);
    } else if (change.op === "replace") {
      replaceMap.set(change.block, change.html);
    } else {
      deleteSet.add(change.block);
    }
  }

  const out: string[] = [];

  const startInserts = insertMap.get(-1);
  if (startInserts) {
    for (const html of startInserts) out.push(wrapBlockTextWith(html, "ins"));
  }

  for (const block of blocks) {
    if (deleteSet.has(block.index)) {
      out.push(wrapBlockTextWith(block.html, "del"));
    } else if (replaceMap.has(block.index)) {
      out.push(wrapBlockTextWith(block.html, "del"));
      out.push(wrapBlockTextWith(replaceMap.get(block.index)!, "ins"));
    } else {
      out.push(block.html);
    }
    const inserts = insertMap.get(block.index);
    if (inserts) {
      for (const html of inserts) out.push(wrapBlockTextWith(html, "ins"));
    }
  }

  return out.join("");
};
