/**
 * Audio-specific grading pedagogy. Used only by the voice-grade agent that
 * receives raw audio (not a transcript). The text-grade agent uses the
 * sibling grading-pedagogy.ts module.
 */

/** Pronunciation rubric — A2 default tolerance, scaled by CEFR level. */
export const AUDIO_PRONUNCIATION_RULES = `PRONUNCIATION GRADING.

You are listening to the actual audio, not a transcript. Judge pronunciation, intonation, and fluency from what you hear.

Score pronunciation on the SAME 0-10 scale as the overall grade, but as a separate dimension that feeds into the final score:
- 10: Clear, native-like for the level. Words are recognizable on first listen.
- 8-9: A few words mispronounced but the meaning is never lost.
- 6-7: Several mispronounced words that briefly slow a listener. Stress patterns sometimes off.
- 4-5: Frequent mispronunciation. Listener has to work. Some words unintelligible.
- 2-3: Mostly unintelligible. Only fragments recognizable.
- 0-1: No speech, wrong language, or unintelligible noise.

Be specific. Name the EXACT word and the issue. Examples:
- "buildings" — final 'gs' cluster dropped, sounded like 'building'
- "thought" — 'th' pronounced as 's' or 'z' (common Moroccan-French calque)
- "three" — 'th' replaced with 't', sounded like 'tree'

Do NOT invent issues. If the audio is clean for the level, pronunciation_errors is an empty array.`;

/** Moroccan-French pronunciation L1 interference. */
export const AUDIO_L1_PRONUNCIATION_RULES = `MOROCCAN-FRENCH PRONUNCIATION INTERFERENCE.

Recognize and label these recurring patterns. Flag them in pronunciation_errors with the exact word and a short note naming the L1 source.

- 'th' (voiceless, as in "think") → often pronounced as 's', 't', or 'f'. ("think" → "sink"/"tink")
- 'th' (voiced, as in "this") → often pronounced as 'z' or 'd'. ("this" → "zis"/"dis")
- 'h' at the start of a word → often dropped (French does not pronounce initial 'h'). ("hotel" → "otel")
- French uvular 'r' instead of English alveolar 'r'. Flag only if it makes a word unclear.
- Final consonant clusters simplified ("text" → "tex", "asked" → "ask", "buildings" → "building").
- Vowel substitution: short 'i' (ship) ↔ long 'ee' (sheep) confusion.
- Word stress placed on the wrong syllable from French rhythm ("PHOtograph" vs "phoTOgraph").
- 'h' inserted where there is none, OR moved (over-correction after being told French speakers drop 'h').

When you spot one, the note should briefly name the L1 source if it teaches something — but only when it would actually help.`;

/** Fluency rubric — what to listen for beyond word-level pronunciation. */
export const AUDIO_FLUENCY_RULES = `FLUENCY ASSESSMENT.

In one short sentence (fluency_note field), describe:
- Pace (too slow / appropriate / rushed)
- Hesitations and filler sounds (uh, um, eh) — A2 learners are expected to have some; flag only if excessive
- Intonation (flat, sing-song, native-like rising/falling for questions)
- Sentence rhythm (chopped word-by-word, or grouped into phrases)

Keep the note encouraging. Adult learners need competence signals.`;
