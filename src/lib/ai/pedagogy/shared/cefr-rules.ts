// CEFR vocab budgets and sentence caps. Level rules, shared across all styles.

export interface CefrBudget {
  vocabCapNew: number;        // max distinct new vocabulary items per lesson
  sentenceMaxWords: number;   // student-facing sentence cap
  examplesGrammar: string;    // human-readable target count for grammar examples
}

export const CEFR_BUDGETS: Record<"A1" | "A2" | "B1" | "B2" | "C1" | "C2", CefrBudget> = {
  A1: { vocabCapNew: 8,  sentenceMaxWords: 12, examplesGrammar: "EXACTLY 4 examples, ALL using the same pattern (repetition beats variety at A1)" },
  A2: { vocabCapNew: 12, sentenceMaxWords: 15, examplesGrammar: "5-6 examples, all using the same pattern" },
  B1: { vocabCapNew: 18, sentenceMaxWords: 25, examplesGrammar: "5-8 examples" },
  B2: { vocabCapNew: 25, sentenceMaxWords: 30, examplesGrammar: "5-8 examples, including at least one in formal register" },
  C1: { vocabCapNew: 25, sentenceMaxWords: 35, examplesGrammar: "5-8 examples mixing registers" },
  C2: { vocabCapNew: 25, sentenceMaxWords: 40, examplesGrammar: "5-8 examples, varied registers and styles" },
};

// Prose form — injected verbatim into every gen prompt.
export const CEFR_LESSON_RULES = `CEFR LEVEL RULES (level controls vocabulary, complexity, and template skeleton):

A1 (Beginner):
- 6-8 new vocabulary items per lesson (max 8).
- Vocabulary from Oxford 3000 only. No academic words, no idioms, no phrasal verbs.
- Sentences: short, present tense, max 12 words.
- Grammar lessons: EXACTLY 4 examples, ALL using the same pattern (repetition beats variety at A1).
- Pure English throughout. Meaning comes from short context, examples, and (for grammar) "Say/Not" pairs.
- ZERO metalanguage in student-facing text. No "uncountable", "auxiliary", "third-person singular", "article", "preposition", "modal" — these are teacher words. Show the right form; don't name the rule.
- Grammar lesson titles name the FUNCTION, not the rule: "Talking about every day", NOT "Present simple".

A2 (Elementary):
- 10-12 new vocabulary items per lesson.
- Oxford 3000 + a few high-frequency domain words (work, home, travel).
- Sentences max 15 words.
- Grammar lessons: 5-6 examples, all using the same pattern.
- Pure English throughout.
- Minimal metalanguage allowed: "singular / plural" is OK. "Uncountable", "auxiliary", "modal", "third-person singular" are still banned.
- Grammar titles still functional ("Talking about yesterday"), not analytical.

B1 (Intermediate):
- Max 18 vocabulary items.
- Oxford 3000-5000. Phrasal verbs OK if common (find out, look for, give up).
- Sentences may be complex but stay readable. Avoid academic jargon.
- 5-8 examples.

B2 (Upper Intermediate):
- Max 25 vocabulary items.
- Full Oxford 5000 + early Academic Word List.
- Nuanced explanations OK. Compare close synonyms.
- 5-8 examples, including at least one in formal register.
- Common mistakes section focuses on register, collocation, register-appropriate use.

C1 (Advanced):
- Max 25 vocabulary items, including specialized / less frequent words.
- Cover register, connotation, stylistic variation.
- 5-8 examples mixing registers.
- "Common mistakes" focuses on overuse, register mismatch, idiomatic precision.

C2 (Proficiency):
- Up to 25 items, often rare / literary / idiomatic.
- Discuss connotation, irony, register, collocation strength.
- 5-8 examples, varied registers and styles.`;

// Banned at A1/A2 in student-facing text. Used by gen prompt + judge pre-checks.
export const A1_A2_BANNED_METALANGUAGE = [
  "uncountable",
  "auxiliary",
  "third-person",
  "third person",
  "article",
  "preposition",
  "modal",
  "infinitive",
] as const;

// Feel-common but above-A1 words. Used by gen self-check and judge vocab check.
export const A1_OFFENDER_VOCAB: Array<{ avoid: string; preferred: string }> = [
  { avoid: "destination", preferred: "place you go to / where you go" },
  { avoid: "journey", preferred: "trip" },
  { avoid: "luggage", preferred: "bag / bags" },
  { avoid: "booking", preferred: 'verb "book" ("I book a hotel")' },
  { avoid: "reservation", preferred: '"book" (verb)' },
  { avoid: "official", preferred: "simpler description, often droppable" },
  { avoid: "emphasize", preferred: "show / mean" },
  { avoid: "opportunity", preferred: "chance" },
  { avoid: "individual", preferred: "person" },
  { avoid: "purchase", preferred: "buy" },
  { avoid: "location", preferred: "place" },
  { avoid: "accommodate", preferred: "fit / take" },
  { avoid: "anxious", preferred: "sad / angry / not happy" },
  { avoid: "frustrated", preferred: "sad / angry / not happy" },
  { avoid: "embarrassed", preferred: "sad / angry / not happy" },
  { avoid: "sufficient", preferred: "enough" },
  { avoid: "immediately", preferred: "now / fast" },
  { avoid: "require", preferred: "need" },
  { avoid: "provide", preferred: "give" },
];

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LevelBucket = "a1-a2" | "b1-plus";

export const levelBucketFor = (level: CEFRLevel): LevelBucket =>
  level === "A1" || level === "A2" ? "a1-a2" : "b1-plus";
