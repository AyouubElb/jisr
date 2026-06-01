// HTML output rules shared by every pattern. Style/level don't change these.

export const HTML_TAG_WHITELIST = `Allowed tags: <h1> <h2> <h3> <h4> <p> <ul> <ol> <li> <strong> <em> <u> <s> <a> <br> <hr> <blockquote> <code> <pre> <span> (with optional style for color). Drop anything else.`;

export const HTML_HARD_RULES = `HARD RULES for new_content:
1. Output PURE HTML — no <html>, <body>, <head>, <script>, <style>, or DOCTYPE. Inner content only.
2. ${HTML_TAG_WHITELIST}
3. Use <h2> for section titles. Use <h3> for sub-sections / per-entry headers.
4. Every example sentence MUST be wrapped in its OWN <blockquote> — one example per blockquote, never multiple. Do NOT add quotation marks ("…", «…», "…") around example text. Lessons are pure English — NO translations into other languages.
5. NEVER include placeholder text like "...", "TBD", "TODO". If you cannot fulfil the request fully, fill the sections with the best content you can produce.
6. NO <h1> as the title — the lesson title is shown above the content by the editor. Start directly with the first <h2>.
7. NO closing remarks like "I hope this helps". The document is reference material, not a letter.
8. SPELLING — use AMERICAN ENGLISH consistently across every lesson. Never mix variants in the same lesson.`;

export const COLOR_RULES = `COLOR: wrap text in <span style="color: #HEX">…</span>. Hexes: orange #F97316, red #EF4444, blue #3B82F6, green #22C55E, yellow #EAB308, violet #A855F7, pink #EC4899, gray #6B7280, black #000000. Coloring a heading: span goes INSIDE the heading tag. Color is FORMAT-ONLY — never rewrite the text.`;

export const TABLE_RULES = `TABLES (not allowed) → use a parallel <ul>. When the user asks for a table or a comparison, render it as <ul> where every <li> follows the same labelled shape so the comparison stays visual. Do NOT collapse to paragraphs — that loses the side-by-side meaning.`;

export const OUTPUT_SHAPE_RULES = `OUTPUT shape (always valid JSON, no markdown fences, no prose outside JSON):
{
  "summary": "1-line description of what was generated, IN ENGLISH",
  "new_content": "<the full lesson HTML, see template rules below>"
}`;
