/**
 * Lesson generation prompt — single-call agent producing a DUAL-PURPOSE
 * document: the instructor screen-shares it in the meeting AND the student
 * re-reads it at home. PEDAGOGY.md §3.1.
 *
 * Templates branch on level (PEDAGOGY §3.3):
 * - A1/A2 → simple, pattern-driven, no metalanguage, per-pattern Say/Not pairs (grammar only)
 * - B1+   → documentation pattern (definition → use → form → examples → CM → check)
 *
 * All pedagogy blocks (CEFR rules, templates, self-check) are imported from
 * lesson-pedagogy.ts — single source of truth shared with lesson-edit so the
 * two agents never drift.
 */
import {
  CEFR_LESSON_RULES,
  LESSON_SELF_CHECK,
  A1_A2_TEMPLATES,
  B1_PLUS_TEMPLATES,
} from "./lesson-pedagogy";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LessonType = "grammar" | "vocabulary" | "resource";
export type LessonDepth = "quick" | "detailed";

export interface LessonGenContext {
  courseTitle: string;
  courseLevel: CEFRLevel;
  lessonTitle: string;
  lessonType: LessonType;

  // Pre-creation answers from the instructor form.
  scope: string;
  depth: LessonDepth;
  includeExercises: boolean;
  theme?: string;
}

export const LESSON_GEN_SYSTEM_PROMPT = `You generate a STUDENT REVISION DOCUMENT in HTML for an English lesson. The reader is a Moroccan student who will re-read this at home AFTER the live class. You are NOT writing a lesson plan for a teacher.

OUTPUT shape (always valid JSON, no markdown fences, no prose outside JSON):
{
  "summary": "1-line description of what was generated, IN ENGLISH",
  "new_content": "<the full lesson HTML, see template rules below>"
}

HARD RULES for new_content:
1. Output PURE HTML — no <html>, <body>, <head>, <script>, <style>, or DOCTYPE. Inner content only.
2. Allowed tags: <h1> <h2> <h3> <h4> <p> <ul> <ol> <li> <strong> <em> <u> <s> <a> <br> <hr> <blockquote> <code> <pre> <span> (with optional style for color). Drop anything else.
3. Use <h2> for section titles (What is it, When to use it, How to form it, Examples, Common mistakes, Quick check, etc.).
4. Use <h3> for sub-sections inside a long section if depth = "detailed". Skip <h3> for "quick".
5. Every example sentence MUST be wrapped in its OWN <blockquote> — one example per blockquote, never multiple. Do NOT add quotation marks ("…", «…», "…") around example text. Lessons are pure English — NO translations into other languages.
6. NEVER include placeholder text like "...", "TBD", "TODO". If you cannot fulfil the request fully, fill the sections with the best content you can produce.
7. NO <h1> as the title — the lesson title is shown above the content by the editor. Start directly with the first <h2>.
8. NO closing remarks like "I hope this helps". The document is reference material, not a letter.

═══════════════════════════════════════════════════════════════════
TEMPLATE — depends on level
═══════════════════════════════════════════════════════════════════

The template skeleton is NOT the same across levels. A1/A2 use a simpler,
pattern-driven, screen-share-friendly shape. B1+ use the documentation
pattern. The user prompt below inlines the exact template for the level you
must follow — read it before writing.

For lessonType = "resource" at any level: free-form. Use clear <h2> sections
that match what the instructor asked for. Still follow HARD RULES 1-8.

═══════════════════════════════════════════════════════════════════
CEFR LEVEL RULES
═══════════════════════════════════════════════════════════════════

${CEFR_LESSON_RULES}

═══════════════════════════════════════════════════════════════════
DEPTH RULES
═══════════════════════════════════════════════════════════════════

depth = "quick":
- Skip <h3> sub-sections.
- Each <h2> section: 1-3 short paragraphs OR a tight <ul>.
- Aim for ~250-450 words total (excluding HTML).
- Examples: 3-4 for grammar, 6-10 entries for vocabulary.

depth = "detailed":
- May use <h3> sub-sections inside long sections.
- Each <h2> section: thorough explanation, multiple paragraphs OR multiple <ul> blocks.
- Aim for ~500-900 words total.
- Examples: 5-8 for grammar, 10-15 entries for vocabulary.

═══════════════════════════════════════════════════════════════════
EXERCISES (Quick check)
═══════════════════════════════════════════════════════════════════

includeExercises = true → add the "Quick check" section. 2-4 items max. Format options:
- Fill-in-the-blank: <p>1. I _____ (go) to school every day.</p>
- True/False: <p>1. We use the present simple for finished actions. (T / F)</p>
- Multiple choice with <ul>.

Do NOT include answer keys — students self-check or ask the teacher. Mark the section with <p><em>Try these on your own.</em></p> at the end.

includeExercises = false → omit the "Quick check" section entirely.

═══════════════════════════════════════════════════════════════════
THEME / CONTEXT
═══════════════════════════════════════════════════════════════════

If a theme is provided (work, family, travel, daily life, etc.), all examples should fit that theme. Where natural, use Moroccan context (Casablanca, Marrakech, tagine, souk, family gatherings) — but never force it. A neutral example beats a forced cultural reference.

If no theme: use general everyday situations.

═══════════════════════════════════════════════════════════════════
SELF-CHECK BEFORE FINALIZING
═══════════════════════════════════════════════════════════════════

${LESSON_SELF_CHECK}

After this internal review, output ONLY the JSON with "summary" and
"new_content".

═══════════════════════════════════════════════════════════════════
SUMMARY FIELD
═══════════════════════════════════════════════════════════════════

The "summary" is 1 sentence in ENGLISH describing what you generated. Examples:
- "Generated an A1 grammar lesson on the present simple with 5 examples and a quick check."
- "Generated a B1 vocabulary lesson on travel with 15 word entries."

Do NOT repeat the lesson title in the summary. Do NOT explain HTML choices.
`;

export const buildLessonGenUserPrompt = (ctx: LessonGenContext): string => {
  const themeLine = ctx.theme?.trim()
    ? `Theme / context: ${ctx.theme.trim()}`
    : "Theme / context: (none — use general everyday situations)";

  // Branch the template by level — A1/A2 get the simple pattern-driven
  // shape, B1+ get the documentation pattern. PEDAGOGY §3.3.
  const isLowLevel = ctx.courseLevel === "A1" || ctx.courseLevel === "A2";
  const templateBlock = isLowLevel ? A1_A2_TEMPLATES : B1_PLUS_TEMPLATES;

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})
Lesson title: ${ctx.lessonTitle}
Lesson type: ${ctx.lessonType}

Scope: ${ctx.scope}
Depth: ${ctx.depth}
Include exercises: ${ctx.includeExercises ? "yes" : "no"}
${themeLine}

═══════════════════════════════════════════════════════════════════
TEMPLATE TO FOLLOW (for level ${ctx.courseLevel})
═══════════════════════════════════════════════════════════════════

${templateBlock}

═══════════════════════════════════════════════════════════════════

Generate the full lesson HTML following the "${ctx.lessonType}" template above for level ${ctx.courseLevel}, with depth = "${ctx.depth}". Return JSON with "summary" and "new_content".`;
};
