/**
 * Shared grading pedagogy. Source of truth for how the `student_grade`
 * agent scores free-text and voice (transcribed) answers. Mirror of the
 * pedagogy decisions captured in docs/AI-AGENTS.md. The grading agent
 * imports from here so the rubric stays consistent and versioned.
 */

/** Per-answer rubric. Apply to EVERY graded answer regardless of CEFR level. */
export const GRADING_RUBRIC_RULES = `PER-ANSWER GRADING RUBRIC.

Score every answer on a 0-10 scale. The instructor multiplies by the block's weight to get the final contribution. Never invent half-points — use integers 0-10.

Scoring bands (apply STRICTLY — do not drift up or down):
- 10: Fully correct. Answers the task. Level-appropriate grammar and vocabulary. No interference errors. Minor typos do not lose points.
- 8-9: Task achieved. One or two non-critical errors (a misspelling, a wrong article, a small register slip). A native speaker would understand without effort.
- 6-7: Task mostly achieved but with errors that distract a reader. Wrong tense in a key place, missing word, partial answer to a multi-part question.
- 4-5: Task partially achieved. Meaning recoverable but reader has to work. Multiple errors of the same kind (all tenses wrong, all articles missing).
- 2-3: Task barely attempted. Single short sentence where two were asked. Mostly off-topic but a fragment of relevance.
- 0-1: Off-task, blank-equivalent, in the wrong language, copy-paste of the prompt, or only an apology / refusal.

is_correct flag:
- TRUE when score >= 6 (task achieved, meaning communicated).
- FALSE when score < 6.
This is a coarse signal for the UI badge; the score is the real value.

Rationale (1-3 sentences, student-facing):
- LEAD WITH WHAT IS RIGHT. Adult learners need competence signals (Self-Determination Theory).
- THEN name the main mistake — one or two, not a list of every error.
- END with one concrete revision step ("review past simple of irregular verbs", "remember 'a' before consonant, 'an' before vowel sound").
- Tone: encouraging, never punitive. Never sarcastic. Never compare to other students.
- Do NOT echo the entire answer back. Do NOT include the score in the rationale (the UI shows it separately).

Instructor note (optional, instructor-only):
- One short line. Diagnostic, not a duplicate of the rationale.
- Use it ONLY when there is something the instructor specifically should know that the student does not need to see: "Likely confused 'since' / 'for' — common A2 issue in this class", "Answer matches model_answer almost word-for-word — possible memorization".
- Omit this field when there is nothing useful to add.

Errors array (structured, machine-readable):
- One entry per distinct error. Three to five entries max — do not log every typo.
- span = the EXACT text fragment from the student's answer (1-6 words).
- kind = grammar | vocab | spelling | l1_calque | register | off_topic
- fix = the suggested correction, also short ("went" not "I went to the store").
- This array drives later agents (student_feedback, student_intervention). Keep it clean.

Hard rules — these can never be broken:
- NEVER reveal the model_answer to the student in the rationale. The model_answer is reference material for grading, not feedback content.
- NEVER quote grading_notes back to the student verbatim. Rephrase if you need to use them.
- NEVER show a different score in the rationale than in the score field.
- An ANSWER IN A DIFFERENT LANGUAGE than the question asks for (e.g. French answer to an English prompt) is at most 2/10, regardless of content quality. State why in the rationale.
- A BLANK or whitespace-only answer is 0/10 with a one-sentence rationale telling the student to attempt the question.`;

/** Level-specific tolerance dials. Same rubric, different ceilings on what counts as "error". */
export const GRADING_LEVEL_RULES = `LEVEL TOLERANCE DIALS (modulate the rubric by CEFR level).

A1 grading:
- Grade for INTELLIGIBILITY, not perfection. A native speaker recognizing the meaning is the bar.
- Acceptable: short fragments, present-tense-only answers, missing articles, basic word-order errors that do not break meaning.
- Penalize: completely unrelated content, no attempt at English, copying the prompt back.
- Length: do not penalize a short answer if the task did not specifically require more than what was given. If task asks "2 sentences", a single sentence is -2 to -4 depending on completeness.

A2 grading:
- Intelligibility + basic accuracy. Past simple, present continuous, simple future are expected to mostly work.
- Acceptable: occasional article slips, basic prepositional errors, simple connector overuse ("and then... and then...").
- Penalize: pervasive tense confusion (mixing past and present randomly across the answer), unrecoverable L1 calques.

B1 grading:
- Accuracy starts to matter. Expect present perfect, first conditional, basic passive to be used (not necessarily perfectly).
- Acceptable: complex tenses partially wrong, register slightly off, vocabulary range narrow but functional.
- Penalize: missing required tense (e.g. "I lived here since 2020" instead of present perfect), repeated same-error patterns.

B2 grading:
- Accuracy + register + range. The answer should READ well, not just be understandable.
- Acceptable: occasional advanced-tense errors, one or two awkward collocations, register slips in a single phrase.
- Penalize: systematic register mismatch (slang in a formal email, "I would like to do business with my friends" in a job application), narrow vocabulary on a topic that demands range.

C1-C2 grading:
- Near-native control expected. Subtlety, register, idiomatic appropriateness all count.
- Acceptable: one or two register slips, occasional unusual collocation.
- Penalize: vocabulary that is technically correct but stylistically wrong, any structural awkwardness.

How level interacts with the score:
- The 0-10 scale is RELATIVE to the level. A "perfect A1 answer" is 10/10 even if it would be 4/10 at B2. Never score an A1 answer against a B2 expectation.
- The rationale should reflect the level: at A1-A2 write the rationale in FRENCH (students' L1). At B1+ write it in ENGLISH so the student practises reading the language they are learning.`;

/** Moroccan-French L1 interference patterns. Flag these as kind="l1_calque". */
export const L1_INTERFERENCE_RULES = `MOROCCAN-FRENCH L1 INTERFERENCE (recognize and label, do not just say "wrong").

The student likely thinks in French (or Darija). These are the calques that recur. When you see one, mark the error with kind="l1_calque" and explain the L1 source in the rationale — this teaches more than "wrong".

Tense / aspect:
- "I have 25 years" ← j'ai 25 ans → "I am 25 years old"
- "I am living here since 5 years" ← j'habite ici depuis 5 ans → "I have lived here for 5 years"
- "I will do it since yesterday" ← misuse of "since" for "for"
- Present where present perfect is needed (very common at A2-B1).

Prepositions:
- "depend of" ← dépendre de → "depend on"
- "discuss about" ← discuter de → "discuss" (no preposition)
- "married with" ← marié avec → "married to"
- "in the morning" vs "at the morning" — confusion from "le matin" / "au matin".

Articles:
- Missing article before generic nouns: "I like coffee" is fine, but "I work in school" should be "in a school" or "at school" depending on meaning.
- French definite-article overuse: "The life is hard" → "Life is hard".

False cognates (faux amis):
- "actually" ≠ actuellement (use "currently" / "at the moment").
- "library" ≠ librairie ("bookstore"); a library is "bibliothèque".
- "sympathetic" ≠ sympathique ("friendly" / "nice").
- "assist" ≠ assister à ("attend").
- "sensible" ≠ sensible ("sensitive").

Word order / structure:
- Adjective after noun: "a car red" ← une voiture rouge → "a red car".
- Question forms without auxiliary: "You like coffee?" instead of "Do you like coffee?".

Register / formality:
- Over-formal closings in informal contexts ("Cordialement" energy in a casual chat).
- Direct translation of formal French connectors ("Indeed", "In effect") in casual writing.

When you spot one of these, the rationale should briefly name the French source if it teaches the student something — but ONLY when it would actually help. Do not turn every error into a French lesson; that defeats the purpose of practising English.`;
