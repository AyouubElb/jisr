// Lesson-gen prompt builder — composes shared rules + the picked pattern's
// templateBlock + few-shot examples. Pattern selection happens in the loader.
import { pickPattern } from "../pedagogy/loader";
import type { LessonStyle } from "../pedagogy/styles";
import {
  HTML_HARD_RULES,
  OUTPUT_SHAPE_RULES,
} from "../pedagogy/shared/html-rules";
import { CEFR_LESSON_RULES } from "../pedagogy/shared/cefr-rules";
import { LESSON_SELF_CHECK } from "../pedagogy/shared/self-check";

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
  // Optional — defaults to "documentary" (the only style shipped in Phase A).
  style?: LessonStyle;
}

export const LESSON_GEN_SYSTEM_PROMPT = `You generate a STUDENT REVISION DOCUMENT in HTML for an English lesson. The reader is a Moroccan student who will re-read this at home AFTER the live class. You are NOT writing a lesson plan for a teacher.

${OUTPUT_SHAPE_RULES}

${HTML_HARD_RULES}

═══════════════════════════════════════════════════════════════════
TEMPLATE
═══════════════════════════════════════════════════════════════════

The template skeleton is provided in the USER PROMPT below. It is chosen for this specific (style, level, lesson type) — follow it exactly. Section order, allowed sub-blocks, and rules in the template OVERRIDE anything generic above.

═══════════════════════════════════════════════════════════════════
CEFR LEVEL RULES
═══════════════════════════════════════════════════════════════════

${CEFR_LESSON_RULES}

═══════════════════════════════════════════════════════════════════
DEPTH RULES
═══════════════════════════════════════════════════════════════════

depth = "quick":
- Skip <h3> sub-sections where the template marks them optional.
- Each <h2> section: 1-3 short paragraphs OR a tight <ul>.
- Aim for ~250-450 words total (excluding HTML).
- Examples: 3-4 for grammar, 6-10 entries for vocabulary.

depth = "detailed":
- May use <h3> sub-sections inside long sections.
- Each <h2> section: thorough explanation, multiple paragraphs OR multiple <ul> blocks.
- Aim for ~500-900 words total.
- Examples: 5-8 for grammar, 10-15 entries for vocabulary.

═══════════════════════════════════════════════════════════════════
EXERCISES (Quick check / Try it / Try saying it)
═══════════════════════════════════════════════════════════════════

includeExercises = true → emit the exercise section the template specifies (Quick check / Try it / Try saying it). 2-4 items max. Do NOT include answer keys.

includeExercises = false → omit the exercise section entirely.

═══════════════════════════════════════════════════════════════════
THEME / CONTEXT
═══════════════════════════════════════════════════════════════════

If a theme is provided (work, family, travel, daily life, etc.), all examples should fit that theme. Where natural, use Moroccan context (Casablanca, Marrakech, tagine, souk, family gatherings) — but never force it. A neutral example beats a forced cultural reference.

If no theme: use general everyday situations.

═══════════════════════════════════════════════════════════════════
SELF-CHECK BEFORE FINALIZING
═══════════════════════════════════════════════════════════════════

${LESSON_SELF_CHECK}

After this internal review, output ONLY the JSON with "summary" and "new_content".

═══════════════════════════════════════════════════════════════════
SUMMARY FIELD
═══════════════════════════════════════════════════════════════════

The "summary" is 1 sentence in ENGLISH describing what you generated. Examples:
- "Generated an A1 grammar lesson on the present simple with 5 examples and a quick check."
- "Generated a B1 vocabulary lesson on travel with 15 word entries."

Do NOT repeat the lesson title in the summary. Do NOT explain HTML choices.
`;

const renderExamples = (
  examples: ReturnType<typeof pickPattern>["examples"],
): string => {
  if (examples.length === 0) return "";
  const blocks = examples
    .map(
      (ex, i) => `
─── EXAMPLE ${i + 1} — ${ex.title} ───
Scope: ${ex.scope}
HTML:
${ex.html}
`,
    )
    .join("\n");
  return `\n═══════════════════════════════════════════════════════════════════
WORKED EXAMPLES (match this shape, not the literal content)
═══════════════════════════════════════════════════════════════════
${blocks}
`;
};

export const buildLessonGenUserPrompt = (ctx: LessonGenContext): string => {
  const style: LessonStyle = ctx.style ?? "documentary";
  const pattern = pickPattern({
    style,
    level: ctx.courseLevel,
    lessonType: ctx.lessonType,
  });

  const themeLine = ctx.theme?.trim()
    ? `Theme / context: ${ctx.theme.trim()}`
    : "Theme / context: (none — use general everyday situations)";

  const examplesBlock = renderExamples(pattern.examples);

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})
Lesson title: ${ctx.lessonTitle}
Lesson type: ${ctx.lessonType}
Style: ${style} (${pattern.id})

Scope: ${ctx.scope}
Depth: ${ctx.depth}
Include exercises: ${ctx.includeExercises ? "yes" : "no"}
${themeLine}

═══════════════════════════════════════════════════════════════════
WHEN THIS PATTERN FITS
═══════════════════════════════════════════════════════════════════

${pattern.whenToUse}

═══════════════════════════════════════════════════════════════════
TEMPLATE TO FOLLOW (${pattern.id})
═══════════════════════════════════════════════════════════════════

${pattern.templateBlock}
${examplesBlock}
═══════════════════════════════════════════════════════════════════

Generate the full lesson HTML following the template above for level ${ctx.courseLevel}, with depth = "${ctx.depth}". Return JSON with "summary" and "new_content".`;
};
