import type { LessonPattern } from "../styles";

const templateBlock = `A1/A2 GRAMMAR TEMPLATE (documentary — functional title, per-form sub-blocks, student-facing pattern sentences with zero metalanguage):

Output shape, in this order:

  <h2>{topic — FUNCTIONAL framing, not the grammar name}</h2>
    [e.g. "Talking about every day", NOT "Present simple"]

  <h2>When you need this</h2>
  <p>{one short paragraph in context — when the student needs this language}</p>

  [for EACH form the lesson actually supports — affirmative, negative, question — emit ONE sub-block. Skip any form that does not apply to this grammar point. Order: affirmative → negative → question.]

    <h3>{Form name: Affirmative / Negative / Question}</h3>
    <p><em>Rule:</em> {1-2 short sentences the INSTRUCTOR reads and explains in their own words. Metalanguage is allowed here ("subject", "verb", "auxiliary do/does", "third-person -s") because the instructor is the reader, not the student.}</p>
    <blockquote>{first pattern sentence — same shape with one word swapped between sentences}</blockquote>
    <blockquote>{second pattern sentence}</blockquote>
    <blockquote>{third pattern sentence}</blockquote>
    [2-3 blockquotes total per form — ONE sentence per blockquote, never multiple]

  [end per-form]

  <h2>Say this, not this</h2>
  [2-3 error pairs across the forms covered, each as a <p>. ZERO metalanguage in the Say/Not pairs themselves — these are student-facing.]
    <p><em>Say:</em> {right form} <em>Not:</em> {wrong form}</p>

  <h2>Try it</h2>   ← only if includeExercises = true
  [3-4 pattern fill-in prompts, each as a <p>. Use ___ for the blank.]
    <p>{Sentence with ___ (verb in parentheses).}</p>

Rules:
- Title names the FUNCTION, not the rule. "Talking about every day" / "Saying where things are" / "Asking simple questions".
- Emit ONLY the forms the grammar point genuinely has. If the rule has no negative or no question form, omit that sub-block — do not invent one.
- The "Rule" line is for the INSTRUCTOR. Metalanguage allowed here. Keep it to 1-2 short sentences they can read and reframe live. Highlight the KEY TERMS (the auxiliary, the ending, the structural pivot — e.g. "do/does", "-s", "auxiliary", "subject") with <strong> for plain emphasis, OR <strong><span style="color: #F97316">…</span></strong> for orange-bold when the term is the central pivot of the rule. Use highlighting sparingly — 1-3 terms per rule, not every word.
- Pattern sentences inside the <blockquote> are student-facing — same constraints as before: short, repetitive, one word swap per line, ZERO metalanguage.
- "Say this, not this" pairs and "Try it" prompts are student-facing — NO metalanguage there. No "subject", "verb", "auxiliary", "third-person" outside the <em>Rule:</em> line.
- "Try it" is pattern fill-ins, NOT multiple-choice. No answer keys.`;

export const documentaryA1A2Grammar: LessonPattern = {
  id: "documentary-a1-a2-grammar",
  style: "documentary",
  levelBucket: "a1-a2",
  lessonType: "grammar",
  whenToUse:
    "Default A1/A2 grammar lesson. Functional title (no metalanguage in the title), per-form sub-blocks where the instructor-facing <em>Rule:</em> line carries the explanation and the student-facing pattern sentences carry the practice. Errors live in 'Say this, not this' pairs, not a 'Common mistakes' section.",
  templateBlock,
  examples: [],
  styleChecks: [
    {
      id: "A1A2_GRAMMAR_FUNCTIONAL_TITLE",
      description:
        "The first <h2> names the FUNCTION (e.g. 'Talking about every day'), not the grammar rule (not 'Present simple', not 'Past continuous').",
      kind: "soft",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_HAS_WHEN_YOU_NEED_THIS",
      description:
        "A <h2>When you need this</h2> section exists with a short paragraph describing the usage context.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_PER_FORM_SUBBLOCKS",
      description:
        "Each form covered (Affirmative / Negative / Question) is emitted as: <h3>Form</h3> + <p><em>Rule:</em> ...</p> + 2-3 <blockquote> elements, ONE pattern sentence per blockquote.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_EXAMPLES_COUNT",
      description:
        "Total pattern-sentence count is correct for the level: A1 = EXACTLY 4 (all same pattern); A2 = 5-6 (all same pattern).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_HAS_SAY_NOT_PAIRS",
      description:
        "A <h2>Say this, not this</h2> section exists with 2-3 <p> error pairs using <em>Say:</em> ... <em>Not:</em> ... format.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_NO_COMMON_MISTAKES",
      description:
        "No <h2>Common mistakes</h2> section (errors live in 'Say this, not this' at A1/A2).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_METALANGUAGE_BOUNDARY",
      description:
        "Metalanguage ('subject', 'verb', 'auxiliary', 'third-person', 'article', 'preposition', 'modal') appears ONLY inside the <em>Rule:</em> line. It must NOT appear in pattern sentences, Say/Not pairs, Try-it prompts, or the 'When you need this' paragraph.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_PATTERN_REPETITION",
      description:
        "Pattern sentences within a form sub-block share the SAME structural shape with only one word swapped between them (repetition beats variety at A1/A2).",
      kind: "soft",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_SENTENCE_LENGTH",
      description:
        "Student-facing sentences (pattern sentences, Say/Not pairs, Try-it prompts, When-you-need paragraph) stay under the level cap: A1 max 12 words, A2 max 15 words.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_NO_INVENTED_FORMS",
      description:
        "Only forms the grammar point genuinely has are emitted. No invented negative or question form when the rule does not have one.",
      kind: "soft",
      severity: "must_fix",
    },
    {
      id: "A1A2_GRAMMAR_RULE_LINE_HIGHLIGHTING",
      description:
        "The <em>Rule:</em> line uses highlighting with restraint. Orange-bold (<strong><span style=\"color: #F97316\">…</span></strong>) marks the central structural pivot — at most 1-2 per rule. Plain <strong> marks secondary anchors (the words that change between forms). Total combined highlights stay under roughly half the words in the line. ONLY flag if nearly every content word is bolded — that is the problem the rule targets.",
      kind: "soft",
      severity: "should_fix",
    },
    {
      id: "A1A2_GRAMMAR_TRY_IT_NOT_MCQ",
      description:
        "If a <h2>Try it</h2> section is present (includeExercises = true), items are pattern fill-ins with ___ blanks. Not multiple choice. No answer keys.",
      kind: "hard",
      severity: "must_fix",
    },
  ],
};
