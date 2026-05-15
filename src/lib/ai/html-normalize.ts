import { parse, HTMLElement, NodeType, type Node } from "node-html-parser";

// Clean lesson HTML before the AI sees it: drop empty inline shells
// (<strong></strong>), empty blocks, and nested identical blockquotes.
// Defense-in-depth alongside lesson-diff.ts — stops corruption compounding.

const isElement = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;

// Inline tags that are noise when empty (<br>/<hr> stay — they're meaningful).
const STRIP_IF_EMPTY_INLINE = new Set(["STRONG", "EM", "U", "S", "SPAN", "CODE", "A"]);

const STRIP_IF_EMPTY_BLOCK = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "LI", "UL", "OL", "PRE",
]);

const hasVisibleText = (el: HTMLElement): boolean => el.text.trim().length > 0;

const hasRealChild = (el: HTMLElement): boolean =>
  el.childNodes.some((c) => isElement(c) && (c as HTMLElement).tagName !== "BR");

// <blockquote><blockquote>…</blockquote></blockquote> → one blockquote.
// A blockquote whose only content is one child blockquote is redundant: lift
// the inner one up. Looped on the whole tree until stable so any depth flattens.
const collapseNestedBlockquotes = (root: HTMLElement): void => {
  let collapsed = true;
  while (collapsed) {
    collapsed = false;
    for (const el of root.querySelectorAll("blockquote")) {
      const elementChildren = el.childNodes.filter(isElement);
      const hasLooseText = el.childNodes.some(
        (c) => !isElement(c) && c.rawText.trim().length > 0,
      );
      if (
        elementChildren.length === 1 &&
        elementChildren[0].tagName === "BLOCKQUOTE" &&
        !hasLooseText
      ) {
        el.replaceWith(parse(elementChildren[0].toString()));
        collapsed = true;
      }
    }
  }
};

// Drop empty inline shells and empty blocks. Loops until stable.
const pruneEmpty = (root: HTMLElement): void => {
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const el of root.querySelectorAll("*")) {
      const tag = el.tagName;
      if (STRIP_IF_EMPTY_INLINE.has(tag) && !hasVisibleText(el)) {
        el.remove();
        pruned = true;
      } else if (
        STRIP_IF_EMPTY_BLOCK.has(tag) &&
        !hasVisibleText(el) &&
        !hasRealChild(el)
      ) {
        el.remove();
        pruned = true;
      }
    }
  }
};

export const normalizeHtml = (html: string): string => {
  if (!html.trim()) return html;
  const root = parse(html);
  // Prune first so empty shells don't hide a collapsible blockquote pair;
  // collapse; prune again since collapsing can expose new empties.
  pruneEmpty(root);
  collapseNestedBlockquotes(root);
  pruneEmpty(root);
  return root.toString();
};
