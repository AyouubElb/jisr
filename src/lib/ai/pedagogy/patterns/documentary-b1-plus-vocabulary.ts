import type { LessonPattern } from "../styles";

const templateBlock = `B1+ VOCABULARY TEMPLATE (documentary — definition-paragraph pattern, per-word entry with meaning, example, optional collocations / false-friend notes):

Output shape, in this order:

  <h2>About these words</h2>
  <p>{1-2 sentence intro framing the theme.}</p>

  <h2>Word list</h2>
  [for EACH word — up to the level cap (B1: 18, B2-C2: 25)]
    <h3>{word}</h3>
    <p>{meaning — a clear definition in plain English. Must NOT use a word harder than the word being defined.}</p>
    <blockquote>{one example sentence using the word in a realistic context}</blockquote>
    <p><em>Collocations:</em> {2-4 common collocations}</p>   ← add only when natural
    <p><em>Be careful:</em> {false-friend note OR register pitfall OR pronunciation gotcha}</p>   ← add only when needed

  <h2>Common mistakes</h2>
  <ul>
    <li>{pronunciation / spelling / register / typical error}</li>
    [2-4 items total]
  </ul>

  <h2>Quick check</h2>   ← only if includeExercises = true
  [2-4 self-test items, each as a <p>. No answer keys. Mark the section closing with <p><em>Try these on your own.</em></p>.]

Rules:
- Documentation pattern: definition first, example second, optional metadata after.
- Each word's example sentence is in its OWN <blockquote>. No multiple examples per blockquote.
- Metalanguage is allowed at B1+ — students can decode "uncountable", "phrasal verb", "preposition".
- "Be careful:" lines are used sparingly — only when a word has a real false-friend / register / pronunciation pitfall. Do not add one to every entry.
- Common mistakes list is REAL learner errors at this level. No invented British/American distinctions.
- Total new vocabulary stays within the level cap: B1 ≤ 18, B2-C2 ≤ 25.`;

export const documentaryB1PlusVocabulary: LessonPattern = {
  id: "documentary-b1-plus-vocabulary",
  style: "documentary",
  levelBucket: "b1-plus",
  lessonType: "vocabulary",
  whenToUse:
    "Default B1+ vocabulary lesson. Documentation pattern — word + meaning + example + optional collocations / false-friend note. Reads as a reference glossary the student returns to.",
  templateBlock,
  examples: [],
  styleChecks: [
    {
      id: "B1PLUS_VOCAB_HAS_ABOUT_SECTION",
      description:
        "An <h2>About these words</h2> section opens the lesson with a 1-2 sentence theme framing.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_VOCAB_HAS_WORD_LIST_SECTION",
      description: "An <h2>Word list</h2> section follows the intro.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_VOCAB_PER_WORD_SHAPE",
      description:
        "Each <h3>word</h3> entry is followed by a <p>meaning</p> and at least one <blockquote> example. Optional <p><em>Collocations:</em> ...</p> and <p><em>Be careful:</em> ...</p> may follow.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_VOCAB_HAS_COMMON_MISTAKES",
      description:
        "An <h2>Common mistakes</h2> section appears after the word list, rendered as a <ul> with 2-4 items.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "B1PLUS_VOCAB_COUNT_WITHIN_CAP",
      description:
        "Number of <h3>word</h3> entries is within the level cap: B1 ≤ 18, B2/C1/C2 ≤ 25.",
      kind: "hard",
      severity: "must_fix",
    },
  ],
};
