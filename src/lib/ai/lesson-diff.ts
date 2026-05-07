import { diff_match_patch } from "diff-match-patch";

// Block-level HTML diff. Splits each side into block elements (<p>, <h2>,
// <blockquote>, <li>, etc.), diffs the blocks as units, then wraps each
// changed block's text content in <span data-diff="del"> / "ins">. The
// Tiptap diff-marks extension renders these red/green when the editor is
// in preview mode.

// Resolve a diff-marked HTML to its final form. Accept = drop deletions, keep
// insertions. Reject = drop insertions, keep deletions.
export const applyDiffDecision = (
  diffHtml: string,
  decision: "accept" | "reject",
): string => {
  const drop = decision === "accept" ? "del" : "ins";
  const keep = decision === "accept" ? "ins" : "del";
  const dropRe = new RegExp(
    `<span[^>]*data-diff=["']${drop}["'][^>]*>[\\s\\S]*?</span>`,
    "g",
  );
  const keepRe = new RegExp(
    `<span[^>]*data-diff=["']${keep}["'][^>]*>([\\s\\S]*?)</span>`,
    "g",
  );
  let result = diffHtml.replace(dropRe, "").replace(keepRe, "$1");
  // Remove block tags left empty after deletions are stripped.
  // Runs twice: first pass cleans inner <p>/<li>/etc., second pass cleans
  // outer wrappers (e.g. <blockquote><p><br></p></blockquote>) left empty
  // after the inner block was removed.
  const emptyBlockRe = /<(p|h[1-6]|blockquote|li|pre)(\s[^>]*)?>\s*(<br[^>]*>\s*)*<\/\1>/g;
  result = result.replace(emptyBlockRe, "").replace(emptyBlockRe, "");
  return result;
};

// Block tags we split on. Each becomes one diff unit.
const BLOCK_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "li",
  "pre",
  "hr",
];

// Split an HTML string into top-level block units. Each unit is a self-
// contained outerHTML string. List wrappers (<ul>, <ol>) are preserved as
// boundary markers so they survive in the output.
const splitBlocks = (html: string): string[] => {
  if (!html.trim()) return [];
  const blocks: string[] = [];
  // Match opening tag of each block element + capture until its closing tag.
  // Also capture <ul>/<ol> wrappers so we can keep their structure.
  const re = new RegExp(
    `<(?:${BLOCK_TAGS.join("|")}|ul|ol)\\b[^>]*>[\\s\\S]*?</(?:${BLOCK_TAGS.join("|")}|ul|ol)>|<hr\\s*/?>`,
    "gi",
  );
  let last = 0;
  for (const m of html.matchAll(re)) {
    const idx = m.index;
    if (idx === undefined) continue;
    if (idx > last) {
      const between = html.slice(last, idx).trim();
      if (between.length > 0) blocks.push(between);
    }
    blocks.push(m[0]);
    last = idx + m[0].length;
  }
  if (last < html.length) {
    const tail = html.slice(last).trim();
    if (tail.length > 0) blocks.push(tail);
  }
  return blocks;
};

// Map each unique block to a unique code point so diff_match_patch can run
// at block granularity. Same trick its line-mode uses.
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

// Wrap each text node inside an HTML block with a data-diff span.
// Tags inside the block are kept untouched.
const wrapBlockTextWith = (blockHtml: string, kind: "del" | "ins"): string => {
  return blockHtml.replace(/(>)([^<]+)(<)/g, (_, before, text: string, after) => {
    if (text.trim().length === 0) return `${before}${text}${after}`;
    return `${before}<span data-diff="${kind}">${text}</span>${after}`;
  });
};

export const buildDiffHtml = (oldHtml: string, newHtml: string): string => {
  if (oldHtml === newHtml) return newHtml;

  const oldBlocks = splitBlocks(oldHtml);
  const newBlocks = splitBlocks(newHtml);

  // Empty -> all-new: wrap every new block as ins.
  if (oldBlocks.length === 0) {
    return newBlocks.map((b) => wrapBlockTextWith(b, "ins")).join("");
  }
  // New empty -> all-deleted: wrap every old block as del.
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
