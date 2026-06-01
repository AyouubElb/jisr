import type { LessonPattern } from "../styles";

const templateBlock = `RESOURCE LESSON TEMPLATE (free-form — the instructor pre-declared the lesson is a resource, not a structured grammar/vocab lesson):

Output shape:

  Use clear <h2> sections that match what the instructor asked for in the scope. Common section headings include:
    - Overview / About this resource
    - Key links
    - How to use it
    - Notes / Reminders
    - Suggested practice

  Allowed tags follow the universal whitelist (h2, h3, p, ul, ol, li, strong, em, a, blockquote, hr).
  <a href="..."> links are encouraged here — this is the one lesson type where external links are central.

Rules:
- Free-form structure, but still ORGANIZED. No wall of text. Use sections.
- Pure English. NO translations.
- No invented links. If the instructor did not provide a URL, do not fabricate one — use a placeholder <em>(link to add)</em> or omit.
- No quiz exercises, no Say/Not pairs. Resource lessons are reference material, not practice material.
- Stay short — this is a pointer to other material, not the material itself.`;

export const resourceFreeForm: LessonPattern = {
  id: "resource-free-form",
  // Resource lessons are style-agnostic for now — picked regardless of declared style.
  style: "documentary",
  // levelBucket doesn't drive resource structure; we pick a default for the registry shape.
  levelBucket: "a1-a2",
  lessonType: "resource",
  whenToUse:
    "Lesson is a pointer to external material (link list, reading recommendation, video roundup). Free-form structure with clear sections.",
  templateBlock,
  examples: [],
  styleChecks: [
    {
      id: "RESOURCE_HAS_SECTIONS",
      description:
        "At least 2 <h2> sections present — resource lessons are organized, not a wall of text.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "RESOURCE_NO_FABRICATED_LINKS",
      description:
        "Any <a href> uses a URL that the instructor provided in the scope. No invented URLs (no example.com, no made-up domains).",
      kind: "soft",
      severity: "must_fix",
    },
    {
      id: "RESOURCE_NO_EXERCISES",
      description:
        "No 'Quick check', 'Try it', 'Say this, not this', or other exercise/quiz sections. Resource lessons are reference, not practice.",
      kind: "hard",
      severity: "must_fix",
    },
  ],
};
