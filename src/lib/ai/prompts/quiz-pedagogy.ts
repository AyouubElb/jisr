/**
 * Shared quiz pedagogy. Source of truth for per-block item quality and
 * whole-quiz discipline. Mirror of docs/PEDAGOGY.md §7. Both quiz-gen and
 * quiz-edit (add/update) import from here so they never drift.
 */

/** Per-block rules. Apply to ANY single block. Shared by gen + edit-add + edit-update. */
export const BLOCK_QUALITY_RULES = `PER-BLOCK QUALITY (apply to EVERY item — passage, MCQ, fill-blank, free-text, voice).

These rules come from Cambridge / IELTS / TOEFL item-design standards. They override looser ranges elsewhere in the prompt.

A. Reading passage length (text_passage):
- A1: 80–150 words
- A2: 150–250 words
- B1: 250–400 words
- B2: 400–650 words
- C1: 650–950 words
- C2: 950–1200 words
Sentence average length: ≤10 words at A1, ≤12 at A2, ≤16 at B1, ≤20 at B2, flexible at C1+.

B. Audio script length (audio_passage):
- A1: 60–90 sec (~120–180 words at ~2 wps)
- A2: 90–150 sec (~180–300 words)
- B1: 150–240 sec (~300–480 words)
- B2: 240–360 sec (~480–720 words)
- C1: 360–600 sec (~720–1200 words)
- C2: 600+ sec (~1200+ words)
A user-supplied duration ALWAYS overrides this range (see AUDIO DURATION OVERRIDE rule wherever it appears).

C. Vocabulary band per CEFR level (applies to passages AND items):
- A1: Oxford 500 high-frequency words only
- A2: Oxford 1000
- B1: Oxford 1500 + ~50 most common phrasal verbs
- B2: Oxford 3000 + ~150 phrasal verbs
- C1: Academic Word List + top 5000
- C2: domain / low-frequency / specialized OK
At A1–A2, never blank an unknown word in fill_blank items, and never use a word above level in MCQ stems or distractors.

D. Comprehension questions inside a passage (text_passage / audio_passage):
Mix per passage, regardless of modality:
- Gist (main idea / topic): 15–25%
- Detail (factual recall): 40–50%
- Inference (attitude / "why" / implied): 20–25%
- Vocabulary in context: 10–15%

Order within a passage:
1. Gist question FIRST (orients the reader/listener).
2. Detail questions in TEXT ORDER (Q2 = early in text, Q3 = middle, Q4 = end).
3. Inference question LATE.
4. Vocabulary-in-context placed where the target word appears.

Minimum questions per passage when "questions" is present:
- Floor: 4 questions (UI enforces this; below 4, no passage should have been requested).
- Pedagogically sound: 5+ (one question per category).
- At exactly 4 questions: drop Vocabulary-in-context. Keep 1× Gist + 2× Detail + 1× Inference.
- NEVER drop Gist. It is non-negotiable.
- More than 8 questions per passage only at B2+.

E. MCQ rules (passage AND isolated):
- Number of options:
  - A1–A2: EXACTLY 3 options (cognitive load — 4 is too heavy at this level).
  - B1+: EXACTLY 4 options.
  - True/False MCQs: always 2 options ["True","False"] regardless of level.
- Stem (the question):
  - One concept per item. No double-barreled questions.
  - Stem length: ≤20 words at A1–A2, ≤35 at B1, ≤50 at B2+.
  - Avoid double negatives. Prefer positive phrasing.
- Distractors (wrong answers) — non-negotiable:
  - PLAUSIBLE — a mid-level learner could realistically pick it.
  - DIVERSE — distractors must NOT all be synonyms of the correct answer (otherwise any "big" word works for a "huge" target).
  - Partial-truth distractors are good: a true statement from the passage that doesn't answer the question.
  - Common-error distractors are excellent for our market: encode typical French L1 interference (wrong tense, wrong preposition, omitted article, false cognate).
  - FORBIDDEN: absurd options ("a sandwich" for a geography question), nonsense strings ("xyz", "abc"), "All of the above" / "None of the above" outside grammar well-formedness items.

F. Fill-in-the-blank rules:
- Density (when blanks appear inside a generated sentence): 1 blank per ~50–60 words at A1–B1; 1 per 40–50 at B2+. Most fill_blank items in this app are single-sentence — keep one blank per item.
- Recoverability: every blank must be solvable from the surrounding context alone. No external knowledge required.
- Target words by level:
  - A1–A2: high-frequency verbs, nouns, basic prepositions, articles
  - B1: + conjunctions, common phrasal verbs, more prepositions
  - B2+: + collocations, discourse markers, register-sensitive choices
- NEVER blank an unknown word. Cloze tests recall, not new vocabulary learning. Vocabulary teaching is the lesson's job, not the quiz's.

G. Free-text (writing) prompts:
- A1: 30–50 words target. Highly scaffolded: provide sentence starters or word bank, 3–4 specific points to include.
- A2: 40–60 words. Scaffolded: 2–3 specific points, single tense, one paragraph.
- B1: 80–120 words. Semi-scaffolded: topic + 2–3 points to address, 2–3 paragraphs.
- B2: 150–200 words. Open with structural guidance: genre + structure (intro / body / conclusion).
- C1: 250–400 words. Minimal scaffolding: genre + length only.
- C2: 350–500 words. Free: topic + length.
Always state success criteria explicitly in the rubric (what to include, length, register). One genre per prompt — never mix narrative + opinion in one item.

H. Voice (speaking) prompts:
- A1: 15–30 sec response. Single clear question, one acceptable answer path.
- A2: 30–60 sec. Single question + 1–2 follow-up points.
- B1: 45–90 sec. Topic + 2–3 sub-points.
- B2: 90–150 sec. Open topic with implicit structure.
- C1: 3–5 min. Broad topic, full discourse expected.
- C2: 3–5 min. Minimal scaffolding, abstract topics OK.
Speaking is FORMATIVE-ONLY in this app — pronunciation is not auto-graded. Phrase prompts so the instructor can review the recording. Provide a clear rubric (task achievement, range, fluency) and a model spoken answer.

I. Cultural sensitivity (Moroccan adult learners):
- Prefer neutral / universal topics: travel, work, education, technology, food, family, daily life.
- Avoid: alcohol, dating, politicized framing, gender stereotypes, religious controversy.
- Moroccan context (Casablanca, Marrakech, tagine, souk, family gatherings) is welcome where it fits naturally — never forced.`;

/** Whole-quiz rules. Only used by quiz-gen — edit tools see one block at a time. */
export const QUIZ_LEVEL_RULES = `WHOLE-QUIZ DISCIPLINE (apply across the blocks array — only meaningful when generating a full quiz at once).

- Block ORDER MATTERS. Each text_passage and audio_passage must be followed in the blocks array by its OWN comprehension questions inside the parent block (in the "questions" field). Do NOT split a passage from its questions, do NOT put one passage's questions after a different passage.

- PEDAGOGICAL ORDER (mandatory). Order the blocks array as follows:
  1. text_passage and audio_passage blocks come FIRST (students read/listen with fresh attention).
  2. mcq and fill_blank blocks come MIDDLE (recognition and recall).
  3. free_text and voice_response blocks come LAST (production tasks need warmed-up output).
  Within each tier, keep the order the user requested. If a tier has no blocks, skip it.

- MCQ correct-answer position: rotate evenly across positions within the quiz (≈1/N for each option). Never put the correct answer in the same position three times in a row.

- Block counts MUST match the user request EXACTLY. If the user asks for "1 text_passage", emit EXACTLY one. Never add extra blocks "to make it better".`;
