/**
 * Generator self-check block. Probabilistic — the model "reviews" its draft
 * before emitting. NOT a substitute for the judge, but a cheap first pass.
 * Kept here so all patterns share the same self-check language.
 */

export const LESSON_SELF_CHECK = `SELF-CHECK BEFORE FINALIZING (do this internally, do NOT output it, do NOT narrate it):

Review your draft once against this checklist. Fix any violation, THEN emit.

1. VOCABULARY LEVEL — for every content word you used (noun, verb, adjective, adverb), ask: "Is this word common everyday English at this CEFR level?"
   - At A1: only the most frequent ~1500 English words. If a word feels formal, technical, or rarely heard in casual speech, REPLACE it with a simpler everyday synonym.
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

2. DEFINITION SIMPLICITY — a definition must NEVER use a word harder than the word being defined. If you defined a hard word with an even harder synonym, rewrite using simple everyday English.

3. SENTENCE COMPLEXITY — at A1, no sentence over 12 words; at A2, max 15. Break long sentences into two short ones.

4. VOCAB BUDGET — count distinct new vocabulary items introduced (the <h3>word</h3> entries for vocabulary lessons; or new content words in grammar lessons). Stay within the cap for the level (A1: 8, A2: 12, B1: 18, B2-C2: 25). If over, drop the most advanced items.

5. FACTS — every claim about English must be true. If unsure, omit. No invented register notes, no fake British/American distinctions.`;
