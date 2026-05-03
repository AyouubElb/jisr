/**
 * Strip TipTap-emitted HTML to plain text. Cuts ~40% of tokens the LLM
 * would otherwise spend parsing tags during quiz generation.
 *
 * Block-level tags become newlines so paragraph/list structure survives.
 * Inline tags (strong/em/code) are removed but their text is kept.
 * `<li>` items are prefixed with "- " so lists still read as lists.
 */

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "ul",
  "ol",
  "hr",
  "br",
]);

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

const decodeEntities = (s: string): string =>
  s.replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITIES[m] ?? m);

export const stripLessonHtml = (html: string): string => {
  if (!html) return "";

  let text = html.replace(/<li[^>]*>/gi, "\n- ");

  text = text.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (match, tagName: string) => {
    return BLOCK_TAGS.has(tagName.toLowerCase()) ? "\n" : "";
  });

  text = decodeEntities(text);

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
};
