/**
 * Shared lesson pedagogy — single code translation of docs/PEDAGOGY.md §2-3.
 * Both lesson-gen and lesson-edit import these so they reason identically.
 * Change docs/PEDAGOGY.md first, then here, then bump the importing versions.
 * Blocks are static — they sit in the cached prefix once caching is wired.
 */

/** CEFR vocab budget, sentence length. PEDAGOGY.md §3.4. */
export const CEFR_LESSON_RULES = `CEFR LEVEL RULES (the level controls vocabulary, complexity, AND which template skeleton is used — see PEDAGOGY §3.3):

SPELLING — use AMERICAN ENGLISH consistently across every lesson. Never mix variants in the same lesson.


A1 (Beginner) — uses the SIMPLE template, NOT the documentation template:
- 6-8 new vocabulary items per lesson (max 8).
- Vocabulary from Oxford 3000 only. No academic words, no idioms, no phrasal verbs.
- Sentences: short, present tense, max 12 words.
- Grammar lessons: EXACTLY 4 examples, ALL using the same pattern (repetition beats variety at A1).
- Pure English throughout. Meaning comes from short context, examples, and (for grammar) "Say/Not" pairs.
- GRAMMAR lessons surface common learner errors as per-pattern "Say this, not this" pairs — never as a "Common mistakes" prose section, never with metalanguage. Vocabulary lessons do NOT include "Say/Not" pairs.
- ZERO metalanguage in student-facing text. No "uncountable", "auxiliary", "third-person singular", "article", "preposition", "modal" — these are teacher words. Show the right form; don't name the rule.
- Grammar lesson titles name the FUNCTION, not the rule: "Talking about every day", NOT "Present simple".

A2 (Elementary) — same SIMPLE template as A1, dial turned up:
- 10-12 new vocabulary items per lesson.
- Oxford 3000 + a few high-frequency domain words (work, home, travel).
- Sentences max 15 words.
- Grammar lessons: 5-6 examples, all using the same pattern.
- Pure English throughout.
- GRAMMAR lessons still use per-pattern "Say/Not" pairs. Vocabulary lessons do NOT.
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
   - VOCABULARY lessons: each word entry has phrase + mini dialogue + speaking
     task (in that order, each in its own <blockquote>). Then a "Conversations"
     section with 2-3 realistic conversations using the target words in
     <strong>. NO per-word "Say/Not" pairs. NO "Common mistakes" section.
   - GRAMMAR lessons: errors live in per-pattern "Say this, not this" pairs.
     NO "Common mistakes" section.
   - Pure English throughout the lesson.
   - There is NO metalanguage in student-facing text: no "uncountable",
     "auxiliary", "third-person singular", "article", "preposition", "modal",
     "infinitive", "auxiliary verb". At A2 only "singular / plural" is OK.
     If a sentence uses any banned term, rewrite it to SHOW the form
     instead of NAMING the rule.
     EXCEPTION: in A1/A2 GRAMMAR lessons, the per-form <em>Rule:</em> line
     under each <h3>Affirmative/Negative/Question</h3> sub-block is
     INSTRUCTOR-FACING — metalanguage IS allowed there (the instructor reads
     it and reframes for the student live). Student-facing pattern sentences,
     Say/Not pairs, and Try-it prompts remain metalanguage-free.
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
export const A1_A2_TEMPLATES = `A1/A2 LESSON TEMPLATES (simple, screen-share-friendly, no metalanguage, pure English):

═══════════════════════════════════════════════════════════════════
TEMPLATE — A1/A2 VOCABULARY
═══════════════════════════════════════════════════════════════════

Output shape, in this order:

  <h2>{theme}</h2>
  <p>{one-line function frame: when the student will use these words. ONE sentence.}</p>

  [for EACH word — 6-8 at A1, 10-12 at A2]
    <h3>{word}</h3>
    <blockquote>{one simple phrase using the word — e.g. "I drink tea."}</blockquote>
    <blockquote>{one mini dialogue — two short lines — e.g. "Do you want tea?" → "Yes, please."}</blockquote>
    <blockquote><em>Speaking task:</em> {one open question that invites the student to use the word — e.g. "What do you drink in the morning?"}</blockquote>
  [end per-word]

  <h2>Conversations</h2>
  [2-3 short conversations (Conversation 1, Conversation 2, Conversation 3) — natural, realistic, varied across scenes related to the theme. Each conversation is 6-10 short lines between two named or labelled speakers (Man / Woman, Waiter / Customer, Friend A / Friend B, etc.). Every target word from the list above MUST appear at least once across the conversations and be wrapped in <strong> each time it appears.]

  Format for each conversation — wrap the ENTIRE conversation in a <div data-conversation="N" data-voices='{...}'> container (N = 1, 2, 3…). The container is the stable marker the audio player keys off; the visible heading text can be anything (e.g. "Conversation 1", "Dialog 1", localized variants).

    data-voices is REQUIRED — a JSON object mapping each speaker label EXACTLY as it appears in <strong>Speaker:</strong> to a voice id from this list:
      male voices: onyx, echo, ash, ballad
      female voices: nova, shimmer, coral, sage
    Picking the voice (do this honestly — students rely on it):
      - Speaker label says man / boy / father / Mr. X / waiter / doctor / a man's first name → male voice.
      - Speaker label says woman / girl / mother / Mrs. X / Ms. X / waitress / a woman's first name → female voice.
      - Ambiguous labels (Friend A, Friend B, Speaker 1, Speaker 2): assign one male and one female so the dialogue contrasts.
      - Use DIFFERENT voices for different speakers in the same conversation. Two males → onyx + echo (or any two male voices). Two females → nova + shimmer.

    <div data-conversation="{N}" data-voices='{"{Speaker A}":"{voice}","{Speaker B}":"{voice}"}'>
      <h3>Conversation {N}</h3>
      <p><strong>{Speaker A}:</strong> {short line — wrap any target word in <strong>}</p>
      <p><strong>{Speaker B}:</strong> {short line — wrap any target word in <strong>}</p>
      [continue alternating, 6-10 lines total]
    </div>

  <h2>Try saying it</h2>   ← only if includeExercises = true
  [3-4 pattern fill-in prompts, each as a <p>. No answer keys.]
    <p>{Substitution prompt with ___ marking the blank. Then list 3-4 option words in parentheses.}</p>

Rules:
- NO "About these words" intro paragraph. The theme card + function-frame line IS the intro.
- Pure English only.
- NO definition paragraphs per word. The phrase + dialogue + speaking task ARE the word's context.
- NO "Common mistakes" section.
- NO "Say this, not this" pairs in the vocabulary template (those belong in the GRAMMAR template).
- ZERO metalanguage ("uncountable", "article", "preposition" all banned).
- Conversations must be CREATIVE and varied — different scenes, different speakers, different situations. Do NOT recycle the same speaking task questions as conversation lines. The conversations are the *real-world use* of the words; the per-word section is the *card*.
- Every target word MUST appear bolded (<strong>) at least once across the conversations. A word can appear in multiple conversations.
- Conversations stay short and CEFR-appropriate: A1 lines max 8 words each, A2 max 12 words each.
- "Try saying it" is pattern drills, NOT multiple-choice tests.

═══════════════════════════════════════════════════════════════════
TEMPLATE — A1/A2 GRAMMAR
═══════════════════════════════════════════════════════════════════

Output shape, in this order:

  <h2>{topic — FUNCTIONAL framing, not the grammar name}</h2>
    [e.g. "Talking about every day", NOT "Present simple"]

  <h2>When you need this</h2>
  <p>{one short paragraph in context — when the student needs this language}</p>

  [for EACH form the lesson actually supports — affirmative, negative, question — emit ONE sub-block. Skip any form that does not apply to this grammar point. Order: affirmative → negative → question.]

    <h3>{Form name: Affirmative / Negative / Question}</h3>
    <p><em>Rule:</em> {1-2 short sentences the INSTRUCTOR reads and explains in their own words. Metalanguage is allowed here ("subject", "verb", "auxiliary do/does", "third-person -s") because the instructor is the reader, not the student.}</p>
    <blockquote>
      {2-3 pattern sentences for this form, same shape with one word swapped each time}
      <br>{second sentence}
      <br>{third sentence}
    </blockquote>

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

/**
 * B1+ lesson templates — the original documentation pattern. PEDAGOGY.md §3.3.
 * Used at B1, B2, C1, C2.
 */
export const B1_PLUS_TEMPLATES = `B1+ LESSON TEMPLATES (documentation pattern — definition → use → form → examples → common mistakes → quick check):

═══════════════════════════════════════════════════════════════════
TEMPLATE — B1+ GRAMMAR
═══════════════════════════════════════════════════════════════════

  <h2>What is it</h2>          → 1-2 sentence definition. Plain prose. Metalanguage OK.
  <h2>When to use it</h2>      → Function / meaning. 2-4 typical uses as <ul>.

  [for EACH form the grammar point actually supports — affirmative, negative, question — emit ONE sub-block. Skip any form that does not apply. Order: affirmative → negative → question.]

    <h3>{Form name: Affirmative / Negative / Question}</h3>
    <p><em>Rule:</em> {1-2 sentences. Metalanguage is allowed and useful here ("subject", "auxiliary do/does", "third-person -s"). Highlight 1-3 KEY TERMS with <strong> for plain emphasis, OR <strong><span style="color: #F97316">…</span></strong> for orange-bold when the term is the central pivot of the rule.}</p>
    <blockquote>
      {2-4 example sentences for this form — each on its own line via <br>}
      <br>{second sentence}
      <br>{third sentence}
    </blockquote>

  [end per-form]

  <h2>Common mistakes</h2>     → Typical learner errors, as <ul>. Metalanguage is OK here.
  <h2>Quick check</h2>         → 2-4 self-test items (only if includeExercises = true).

═══════════════════════════════════════════════════════════════════
TEMPLATE — B1+ VOCABULARY
═══════════════════════════════════════════════════════════════════

  <h2>About these words</h2>   → 1-2 sentence intro framing the theme.
  <h2>Word list</h2>           → For each word: <h3>word</h3> + <p>meaning</p> + <blockquote>example</blockquote>. Add <p><em>Collocations:</em> ...</p> if natural. Add <p><em>Be careful:</em> ...</p> for false friends.
  <h2>Common mistakes</h2>     → Pronunciation / spelling / register / typical errors, as <ul>.
  <h2>Quick check</h2>         → 2-4 self-test items (only if includeExercises = true).

Rules:
- Documentation pattern: definition first, function next, then per-form sub-blocks (rule + examples co-located).
- Emit ONLY the forms the grammar point genuinely has. If the rule has no negative or no question form, omit that sub-block — do not invent one.
- Metalanguage is allowed and useful at B1+ (the student can decode "uncountable", "auxiliary", etc.) — including in the per-form <em>Rule:</em> line.
- Highlight key terms in each Rule line sparingly: 1-3 per rule, not every word. <strong> for plain emphasis, <strong><span style="color: #F97316">…</span></strong> for orange-bold on the central pivot.`;
