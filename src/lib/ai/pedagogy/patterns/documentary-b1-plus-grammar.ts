import type { LessonPattern } from "../styles";

const templateBlock = `B1+ GRAMMAR TEMPLATE (documentary — documentation pattern: definition → use → form → examples → common mistakes → quick check):

Output shape, in this order:

  <h2>What is it</h2>
  <p>{1-2 sentence definition. Plain prose. Metalanguage OK at B1+.}</p>

  <h2>When to use it</h2>
  <ul>
    <li>{typical use #1}</li>
    <li>{typical use #2}</li>
    [2-4 typical uses total]
  </ul>

  [for EACH form the grammar point actually supports — affirmative, negative, question — emit ONE sub-block. Skip any form that does not apply. Order: affirmative → negative → question.]

    <h3>{Form name: Affirmative / Negative / Question}</h3>
    <p><em>Rule:</em> {1-2 sentences. Metalanguage is allowed and useful here ("subject", "auxiliary do/does", "third-person -s"). Highlight 1-3 KEY TERMS with <strong> for plain emphasis, OR <strong><span style="color: #F97316">…</span></strong> for orange-bold when the term is the central pivot of the rule.}</p>
    <blockquote>{first example sentence for this form}</blockquote>
    <blockquote>{second example sentence}</blockquote>
    <blockquote>{third example sentence}</blockquote>
    [2-4 blockquotes total per form — ONE sentence per blockquote, never multiple]

  [end per-form]

  <h2>Common mistakes</h2>
  <ul>
    <li>{typical learner error}</li>
    [2-4 items total]
  </ul>

  <h2>Quick check</h2>   ← only if includeExercises = true
  [2-4 self-test items, each as a <p>. No answer keys. End the section with <p><em>Try these on your own.</em></p>.]

Rules:
- Documentation pattern: definition first, function next, then per-form sub-blocks (rule + examples co-located).
- Emit ONLY the forms the grammar point genuinely has. If the rule has no negative or no question form, omit that sub-block — do not invent one.
- Metalanguage is allowed and useful at B1+ throughout — including in the per-form <em>Rule:</em> line.
- Highlight key terms in each Rule line sparingly: 1-3 per rule, not every word. <strong> for plain emphasis, <strong><span style="color: #F97316">…</span></strong> for orange-bold on the central pivot.
- Common mistakes list is REAL learner errors at this level. No invented British/American distinctions.
- Total example count across all forms stays within 5-8 (B1) or 5-8 (B2-C2, with at least one in formal register where relevant).`;

export const documentaryB1PlusGrammar: LessonPattern = {
  id: "documentary-b1-plus-grammar",
  style: "documentary",
  levelBucket: "b1-plus",
  lessonType: "grammar",
  whenToUse:
    "Default B1+ grammar lesson. Documentation pattern — definition, function, per-form sub-blocks, common mistakes. Reads as a reference for the rule, not a screen-share script.",
  templateBlock,
  examples: [],
  styleChecks: [
    {
      id: "B1PLUS_GRAMMAR_HAS_WHAT_IS_IT",
      description: "Opens with <h2>What is it</h2> and a 1-2 sentence definition <p>.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_HAS_WHEN_TO_USE",
      description:
        "An <h2>When to use it</h2> section follows with a <ul> of 2-4 typical uses.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_PER_FORM_SUBBLOCKS",
      description:
        "Each form (Affirmative / Negative / Question) is emitted as: <h3>Form</h3> + <p><em>Rule:</em> ...</p> + 2-4 <blockquote> elements, ONE example sentence per blockquote.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_HAS_COMMON_MISTAKES",
      description:
        "A <h2>Common mistakes</h2> section appears with a <ul> of 2-4 real learner errors.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_EXAMPLES_TOTAL",
      description:
        "Total example sentence count across all form sub-blocks is in the 5-8 range.",
      kind: "hard",
      severity: "should_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_NO_INVENTED_FORMS",
      description:
        "Only forms the grammar point genuinely has are emitted. No invented negative or question form when the rule does not have one.",
      kind: "soft",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_RULE_LINE_HIGHLIGHTING",
      description:
        "The <em>Rule:</em> line uses highlighting with restraint. Orange-bold (<strong><span style=\"color: #F97316\">…</span></strong>) marks the central structural pivot — at most 1-2 per rule. Plain <strong> marks secondary anchors (the words that change between forms). Total combined highlights stay under roughly half the words in the line. ONLY flag if nearly every content word is bolded — that is the problem the rule targets.",
      kind: "soft",
      severity: "should_fix",
    },
    {
      id: "B1PLUS_GRAMMAR_NO_FAKE_REGISTER_NOTES",
      description:
        "No invented register / British-American distinctions. Every claim about English usage is true.",
      kind: "soft",
      severity: "must_fix",
    },
  ],
};
