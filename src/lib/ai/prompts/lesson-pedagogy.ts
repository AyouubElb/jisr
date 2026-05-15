/**
 * Shared lesson pedagogy — single code translation of docs/PEDAGOGY.md §2-3.
 * Both lesson-gen and lesson-edit import these so they reason identically.
 * Change docs/PEDAGOGY.md first, then here, then bump the importing versions.
 * Blocks are static — they sit in the cached prefix once caching is wired.
 */

/** CEFR vocab budget, sentence length, French scaffolding. PEDAGOGY.md §3.4. */
export const CEFR_LESSON_RULES = `CEFR LEVEL RULES (the level controls vocabulary, complexity, French support, AND which template skeleton is used — see PEDAGOGY §3.3):

A1 (Beginner) — uses the SIMPLE template, NOT the documentation template:
- 6-8 new vocabulary items per lesson (max 8).
- Vocabulary from Oxford 3000 only. No academic words, no idioms, no phrasal verbs.
- Sentences: short, present tense, max 12 words.
- Grammar lessons: EXACTLY 4 examples, ALL using the same pattern (repetition beats variety at A1).
- French translations in every example blockquote (next line via <br>) — mandatory.
- L1 interference appears as per-word/per-pattern "Say this, not this" PAIRS — never as a "Common mistakes" prose section, never with metalanguage.
- ZERO metalanguage in student-facing text. No "uncountable", "auxiliary", "third-person singular", "article", "preposition", "modal" — these are teacher words. Show the right form; don't name the rule.
- Grammar lesson titles name the FUNCTION, not the rule: "Talking about every day", NOT "Present simple".

A2 (Elementary) — same SIMPLE template as A1, dial turned up:
- 10-12 new vocabulary items per lesson.
- Oxford 3000 + a few high-frequency domain words (work, home, travel).
- Sentences max 15 words.
- Grammar lessons: 5-6 examples, all using the same pattern.
- French translations still encouraged in blockquotes; transparent cognates ("hotel", "restaurant", "music") may skip the gloss.
- L1 interference still uses per-word "Say/Not" pairs.
- Minimal metalanguage allowed: "singular / plural" is OK. "Uncountable", "auxiliary", "modal", "third-person singular" are still banned.
- Grammar titles still functional ("Talking about yesterday"), not analytical.

B1 (Intermediate):
- Max 18 vocabulary items.
- Oxford 3000-5000. Phrasal verbs OK if common (find out, look for, give up).
- Sentences may be complex but stay readable. Avoid academic jargon.
- 5-8 examples.
- French translations only for tricky phrases or false friends, NOT every example.
- 1-2 French interference notes when relevant.

B2 (Upper Intermediate):
- Max 25 vocabulary items.
- Full Oxford 5000 + early Academic Word List.
- Nuanced explanations OK. Compare close synonyms.
- 5-8 examples, including at least one in formal register.
- NO blanket French translations. Only flag false friends explicitly.
- Common mistakes section focuses on register, collocation, register-appropriate use.

C1 (Advanced):
- Max 25 vocabulary items, including specialized / less frequent words.
- Cover register, connotation, stylistic variation.
- 5-8 examples mixing registers.
- French only when a false friend or pragmatic gap is genuinely useful.
- "Common mistakes" focuses on overuse, register mismatch, idiomatic precision.

C2 (Proficiency):
- Up to 25 items, often rare / literary / idiomatic.
- Discuss connotation, irony, register, collocation strength.
- 5-8 examples, varied registers and styles.
- No French unless a faux ami is the actual point.`;

/** Predictable Francophone learner errors. PEDAGOGY.md §2.3. */
export const FRENCH_L1_INTERFERENCE = `FRENCH L1 INTERFERENCE (our students are Moroccan, French-schooled — these errors are predictable, target them):

| Error | French cause | Fix to teach |
|---|---|---|
| Omitting articles ("I saw book on table") | French generalizes with zero article | Explicit rule + a contrastive example |
| No do-support in negation ("I not go") | French "ne...pas" needs no auxiliary | Note: "English requires 'do' in negatives and questions" |
| Inversion in that-clauses ("I think that go you") | French allows it informally | Explicit: "English never inverts word order in that-clauses" |
| Wrong question word order ("Where you live?") | French has multiple Q forms | Pattern: Q-word + Do/Does/Did + Subject + Verb |
| Bare "on" for passive ("On told me") | French generic "on" | Substitute: "they" or the passive |
| False cognates: actually, eventually, sensible, library, lecture, fabric | Same spelling, different meaning | Flag explicitly when the word appears |

PLACEMENT depends on level:
- **A1/A2** — interference appears as per-word/per-pattern "Say this, not this" PAIRS attached to each entry (one short line, no labels, no "uncountable" / "auxiliary"). NEVER as a "Common mistakes" prose section.
- **B1+** — interference goes in the dedicated "Common mistakes" section, with brief explanation OK (the student can decode it).
- **B2+** — shift the focus to register, collocation, and register-appropriate use, not raw interference.`;

/**
 * Internal review run before emitting. PEDAGOGY.md §3.7. Probabilistic, not
 * a guarantee. Offender word list is curated — grow only on real misses.
 */
export const LESSON_SELF_CHECK = `SELF-CHECK BEFORE FINALIZING (do this internally, do NOT output it, do NOT narrate it):

Review your draft once against this checklist. Fix any violation, THEN emit.

1. VOCABULARY LEVEL — for every content word you used (noun, verb, adjective,
   adverb), ask: "Is this word common everyday English at this CEFR level?"
   - At A1: only the most frequent ~1500 English words. If a word feels formal,
     technical, or rarely heard in casual speech, REPLACE it with a simpler
     everyday synonym.
     Words that FEEL common but are above A1 (replace them):
       destination → place you go to / where you go
       journey     → trip
       luggage     → bag / bags
       booking     → use the verb "book" ("I book a hotel")
       reservation → "book" (verb)
       official    → simpler description, often droppable
       emphasize   → show / mean
       opportunity → chance
       individual  → person
       purchase    → buy
       location    → place
       accommodate → fit / take
       anxious / frustrated / embarrassed → sad / angry / not happy
       sufficient  → enough
       immediately → now / fast
       require     → need
       provide     → give
   - At A2: ~2500 most frequent words. Avoid academic / abstract vocabulary.
   - At B1: ~4000 most frequent + common phrasal verbs. Avoid academic words.
   - At B2: Oxford 5000 + early Academic Word List is OK.
   - At C1/C2: unrestricted, but be deliberate about register.

2. DEFINITION SIMPLICITY — a definition must NEVER use a word harder than the
   word being defined. If you defined a hard word with an even harder synonym,
   rewrite using simple everyday English.

3. SENTENCE COMPLEXITY — at A1, no sentence over 12 words; at A2, max 15.
   Break long sentences into two short ones.

4. VOCAB BUDGET — count distinct new vocabulary items introduced (the
   <h3>word</h3> entries for vocabulary lessons; or new content words in
   grammar lessons). Stay within the cap for the level (A1: 8, A2: 12,
   B1: 18, B2-C2: 25). If over, drop the most advanced items.

5. FACTS — every claim about English must be true. If unsure, omit. No
   invented register notes, no fake British/American distinctions.

6. A1/A2 TEMPLATE DISCIPLINE — if this is an A1 or A2 lesson:
   - There is NO "Common mistakes" section. Errors live in per-word/per-
     pattern "Say this, not this" pairs.
   - There is NO metalanguage in student-facing text: no "uncountable",
     "auxiliary", "third-person singular", "article", "preposition", "modal",
     "infinitive", "auxiliary verb". At A2 only "singular / plural" is OK.
     If a sentence uses any banned term, rewrite it to SHOW the form
     instead of NAMING the rule.
   - Grammar lesson titles must be FUNCTIONAL ("Talking about every day"),
     not analytical ("Present simple"). If the title is analytical, rewrite
     the title before emitting.
   - The "About these words" / definition-paragraph shape is the B1+
     template — do not use it at A1/A2.`;

/**
 * A1/A2 lesson template — projector-friendly, pattern-driven, no metalanguage.
 * PEDAGOGY.md §3.3. The instructor screen-shares this and walks through it
 * with the student; the same artifact is the student's revision doc later.
 */
export const A1_A2_TEMPLATES = `A1/A2 LESSON TEMPLATES (simple, screen-share-friendly, no metalanguage):

═══════════════════════════════════════════════════════════════════
TEMPLATE — A1/A2 VOCABULARY
═══════════════════════════════════════════════════════════════════

Output shape, in this order:

  <h2>{theme}</h2>
  <p>{one-line function frame: when the student will use these words. ONE sentence.}</p>

  [for EACH word — 6-8 at A1, 10-12 at A2]
    <h3>{word}</h3>
    <p>{simple synonym OR French equivalent — ONE short line, NOT a definition paragraph}</p>
    <blockquote>{one pattern sentence using the word}<br>{French gloss}</blockquote>
    <p><em>Say:</em> {correct phrase} <em>Not:</em> {wrong phrase}</p>
  [end per-word]

  <h2>Useful phrases</h2>
  [3-5 functional chunks for the theme. Each in its own <blockquote> with French gloss:]
    <blockquote>{chunk in English}<br>{French gloss}</blockquote>

  <h2>Try saying it</h2>   ← only if includeExercises = true
  [3-4 pattern fill-in prompts, each as a <p>. No answer keys.]
    <p>{Substitution prompt with ___ marking the blank. Then list 3-4 option words in parentheses.}</p>

Rules:
- NO "About these words" intro paragraph. The theme card + function-frame line IS the intro.
- NO definition paragraphs per word. One short synonym or French equivalent line, that's it.
- NO "Common mistakes" section. Errors live in the per-word "Say/Not" pair.
- ZERO metalanguage in any of the above ("uncountable", "article", "preposition" all banned).
- "Try saying it" is pattern drills, NOT multiple-choice tests. Designed for the instructor to walk through on screen.

═══════════════════════════════════════════════════════════════════
TEMPLATE — A1/A2 GRAMMAR
═══════════════════════════════════════════════════════════════════

Output shape, in this order:

  <h2>{topic — FUNCTIONAL framing, not the grammar name}</h2>
    [e.g. "Talking about every day", NOT "Present simple"]

  <h2>When you need this</h2>
  <p>{one short paragraph in context — when the student needs this language}</p>

  <h2>The pattern</h2>
  <blockquote>
    {3-4 short sentences showing the SAME pattern with one word swapped each time}
    <br>{second sentence}
    <br>{third sentence}
    <br>{fourth sentence}
  </blockquote>
  <p><em>Notice:</em> {one short cue line pointing at what the pattern already shows. NO rule paragraph.}</p>

  <h2>Examples</h2>
  [4 short sentences at A1, 5-6 at A2 — ALL using the SAME pattern, each in its own <blockquote> with French gloss]
    <blockquote>{example sentence}<br>{French gloss}</blockquote>

  <h2>Say this, not this</h2>
  [2-3 error pairs, each as a <p>. ZERO metalanguage.]
    <p><em>Say:</em> {right form} <em>Not:</em> {wrong form}</p>

  <h2>Try it</h2>   ← only if includeExercises = true
  [3-4 pattern fill-in prompts, each as a <p>. Use ___ for the blank.]
    <p>{Sentence with ___ (verb in parentheses).}</p>

Rules:
- Title names the FUNCTION, not the rule. "Talking about every day" / "Saying where things are" / "Asking simple questions".
- "The pattern" is a substitution table, NOT a rule paragraph. Show, don't explain.
- "Notice:" cue is ONE short line pointing at the visible pattern. If the cue needs more than one short sentence, the rule is too complex for this template.
- Examples repeat the SAME pattern. At A1, variety hurts retention.
- ZERO metalanguage in any student-facing text. No "subject", "verb", "auxiliary", "third-person".
- "Try it" is pattern fill-ins, NOT multiple-choice. No answer keys.`;

/**
 * B1+ lesson templates — the original documentation pattern. PEDAGOGY.md §3.3.
 * Used at B1, B2, C1, C2.
 */
export const B1_PLUS_TEMPLATES = `B1+ LESSON TEMPLATES (documentation pattern — definition → use → form → examples → common mistakes → quick check):

═══════════════════════════════════════════════════════════════════
TEMPLATE — B1+ GRAMMAR
═══════════════════════════════════════════════════════════════════

  <h2>What is it</h2>          → 1-2 sentence definition. Plain prose.
  <h2>When to use it</h2>      → Function / meaning. 2-4 typical uses as <ul>.
  <h2>How to form it</h2>      → Structure / rule. <ul> for affirmative / negative / question forms when relevant.
  <h2>Examples</h2>            → 5-8 example sentences, each in its own <blockquote>.
  <h2>Common mistakes</h2>     → French L1 interference + typical errors, as <ul>. Metalanguage is OK here.
  <h2>Quick check</h2>         → 2-4 self-test items (only if includeExercises = true).

═══════════════════════════════════════════════════════════════════
TEMPLATE — B1+ VOCABULARY
═══════════════════════════════════════════════════════════════════

  <h2>About these words</h2>   → 1-2 sentence intro framing the theme.
  <h2>Word list</h2>           → For each word: <h3>word</h3> + <p>meaning</p> + <blockquote>example</blockquote>. Add <p><em>Collocations:</em> ...</p> if natural. Add <p><em>Be careful:</em> ...</p> for false friends.
  <h2>Common mistakes</h2>     → Pronunciation / spelling / register / interference, as <ul>.
  <h2>Quick check</h2>         → 2-4 self-test items (only if includeExercises = true).

Rules:
- Documentation pattern: definition before form, function before rule, examples in their own <blockquote>.
- Metalanguage is allowed and useful at B1+ (the student can decode "uncountable", "auxiliary", etc.).
- French gloss only for tricky phrases or false friends, not every example.`;
