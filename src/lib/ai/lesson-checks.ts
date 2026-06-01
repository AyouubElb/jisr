// Deterministic JS checks over generated lesson HTML.
//
// Runs BEFORE the LLM judge. Counts tags, lengths, presence/absence — facts
// that don't need a language model. Output is passed to the judge prompt as
// "pre-computed facts" + a list of already-failed `hard` checks the judge
// does NOT need to re-evaluate.

import type { CEFRLevel } from "./pedagogy/shared/cefr-rules";
import { A1_A2_BANNED_METALANGUAGE } from "./pedagogy/shared/cefr-rules";
import { allowedWordsAtLevel } from "./pedagogy/shared/cefr-vocab";
import { lemmaCandidates } from "./pedagogy/shared/lemmatizer";
import type { LessonPattern } from "./pedagogy/styles";

export interface CheckViolation {
  check_id: string;
  evidence: string;
  block_number?: number | null;
  fix_hint: string;
}

export interface DeterministicCheckResult {
  /** Pre-computed facts the judge sees in its prompt. */
  facts: Record<string, string | number | boolean | null>;
  /** Checks that already FAILED in JS — judge skips these. */
  violations: CheckViolation[];
}

const VOICE_IDS = new Set([
  "onyx",
  "echo",
  "ash",
  "ballad",
  "nova",
  "shimmer",
  "coral",
  "sage",
]);

const stripTags = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const matchAll = (html: string, re: RegExp): RegExpMatchArray[] =>
  Array.from(html.matchAll(re));

const wordCount = (s: string): number =>
  s.trim().split(/\s+/).filter(Boolean).length;

// Words to never flag regardless of CEFR level. Proper nouns, currency,
// loanwords, common abbreviations — same spirit as the PURE_ENGLISH
// exemption in the judge prompt. Lowercased.
const VOCAB_EXEMPT = new Set([
  // Common articles / fillers Oxford lists under variants
  "a", "an", "the",
  // Place names (sample — extend as needed)
  "marrakech", "casablanca", "rabat", "tangier", "fes", "fez", "agadir",
  "morocco", "moroccan", "paris", "london", "tokyo", "york",
  // Currency
  "dirhams", "dirham", "euros", "euro", "dollars", "dollar", "pounds",
  // Loanwords
  "tagine", "couscous", "souk", "hummus", "sushi", "ballet", "cafe",
  "croissant", "baguette",
  // Common contractions Oxford doesn't list separately
  "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
  "haven't", "hasn't", "hadn't", "won't", "wouldn't", "can't", "couldn't",
  "shouldn't", "i'm", "i've", "i'll", "i'd", "you're", "you've", "you'll",
  "he's", "she's", "it's", "we're", "we've", "we'll", "they're",
  "they've", "they'll", "that's", "what's", "let's",
]);

const COUNT_AS_WORD = /^[a-z][a-z'-]*$/;

// Strip a "Common mistakes" section before checking — those paragraphs
// deliberately contain wrong forms / harder vocabulary as teaching demos.
const stripCommonMistakesSection = (html: string): string => {
  const idx = html.search(/<h2>\s*Common mistakes\s*<\/h2>/i);
  if (idx === -1) return html;
  // Drop everything from "Common mistakes" until the next <h2> (or end).
  const tail = html.slice(idx);
  const nextH2 = tail.search(/<h2/i);
  const afterFirst = tail.slice(nextH2 + 1).search(/<h2/i);
  if (afterFirst === -1) return html.slice(0, idx);
  return html.slice(0, idx) + tail.slice(nextH2 + 1 + afterFirst);
};

/**
 * Return up to 20 unique words from the lesson text that are NOT in the
 * cumulative Oxford 3000 set for the target level. Pure deterministic.
 * Used as a pre-computed fact for the judge AND as a soft violation if
 * the offender count crosses a threshold.
 */
const findOffendersAboveLevel = (
  html: string,
  level: CEFRLevel,
  targetWords: string[],
): string[] => {
  const allowed = allowedWordsAtLevel(level);
  const targetSet = new Set(targetWords.map((w) => w.toLowerCase()));

  // First: check the target words themselves. Above-level target words are
  // CEFR mismatches in the lesson topic itself — a B1 lesson with C1
  // headwords like "redundancy" is genuine drift even though the lesson is
  // "teaching" them.
  const offenders: string[] = [];
  const seen = new Set<string>();
  for (const word of targetSet) {
    if (seen.has(word) || word.length < 3) continue;
    seen.add(word);
    const lemmas = lemmaCandidates(word);
    const inLevel = lemmas.some(
      (l) => allowed.has(l) || VOCAB_EXEMPT.has(l),
    );
    if (inLevel) continue;
    offenders.push(word);
    if (offenders.length >= 20) return offenders;
  }

  // Then: scan the lesson body. Skip text from Common Mistakes (deliberately
  // wrong forms) and skip target words (already evaluated above).
  const text = stripTags(stripCommonMistakesSection(html)).toLowerCase();
  const tokens = text.split(/\s+/);
  const survivors: string[] = [];
  for (const raw of tokens) {
    const word = raw.replace(/^[^a-z']+|[^a-z']+$/g, "");
    if (!word || seen.has(word)) continue;
    seen.add(word);
    if (word.length < 3) continue;
    if (!COUNT_AS_WORD.test(word)) continue;
    if (VOCAB_EXEMPT.has(word)) continue;
    if (targetSet.has(word)) continue;
    if (allowed.has(word)) continue;
    survivors.push(word);
  }

  for (const word of survivors) {
    const lemmas = lemmaCandidates(word);
    const inLevel = lemmas.some(
      (l) => allowed.has(l) || targetSet.has(l) || VOCAB_EXEMPT.has(l),
    );
    if (inLevel) continue;
    offenders.push(word);
    if (offenders.length >= 20) break;
  }
  return offenders;
};

// Extract the target vocabulary words from a vocabulary lesson — the
// <h3>word</h3> entries. Grammar lessons don't have these so target list
// stays empty (any word can appear; Oxford set is the only filter).
const extractTargetWords = (html: string): string[] => {
  const words: string[] = [];
  for (const m of matchAll(html, /<h3>([^<]+)<\/h3>/gi)) {
    const text = stripTags(m[1]).trim().toLowerCase();
    if (/^(conversation|affirmative|negative|question)\b/.test(text)) continue;
    // Split multi-word entries ("due diligence") into individual tokens.
    text.split(/\s+/).forEach((t) => {
      const clean = t.replace(/^[^a-z']+|[^a-z']+$/g, "");
      if (clean) words.push(clean);
    });
  }
  return words;
};

export const runDeterministicChecks = ({
  html,
  level,
  pattern,
}: {
  html: string;
  level: CEFRLevel;
  pattern: LessonPattern;
}): DeterministicCheckResult => {
  const facts: Record<string, string | number | boolean | null> = {};
  const violations: CheckViolation[] = [];

  // ── UNIVERSAL ─────────────────────────────────────────────────────────

  const bannedTags = ["html", "body", "head", "script", "style", "table", "img"];
  const foundBanned = bannedTags.filter((t) =>
    new RegExp(`<${t}[\\s>]`, "i").test(html),
  );
  facts.banned_tags_found = foundBanned.join(",") || "none";
  if (foundBanned.length) {
    violations.push({
      check_id: "HTML_TAG_WHITELIST",
      evidence: `Banned tags present: ${foundBanned.map((t) => `<${t}>`).join(", ")}`,
      fix_hint: "Remove tags outside the whitelist.",
    });
  }

  const placeholderRe = /\b(TBD|TODO|\[à compléter\]|lorem ipsum)\b|\.{3,}/i;
  const phMatch = html.match(placeholderRe);
  if (phMatch) {
    violations.push({
      check_id: "NO_PLACEHOLDER_TEXT",
      evidence: phMatch[0],
      fix_hint: "Replace placeholder text with real content.",
    });
  }

  if (/<h1[\s>]/i.test(html)) {
    violations.push({
      check_id: "NO_H1",
      evidence: "<h1> tag present",
      fix_hint:
        "Remove the <h1> — the editor renders the lesson title above the content.",
    });
  }

  // Oxford 3000 candidate offenders — JS shrinks the haystack from the
  // whole lesson to ~30 words outside the cumulative Oxford set. LLM judge
  // decides which ones are REAL drift (vs inflections, proper nouns, target
  // words, currency). See check VOCAB_LEVEL_FIT_JUDGED in the judge prompt.
  // Pure-deterministic vocab fit. JS scans target words and body against
  // the Oxford 3000/5000 cumulative set for the lesson level. LLM is no
  // longer in the loop — it was too unreliable on vague soft checks.
  // C2 has no vocab cap, skip entirely.
  if (level !== "C2") {
    const targetWords = extractTargetWords(html);
    const offenders = findOffendersAboveLevel(html, level, targetWords);
    facts.vocab_offenders = offenders.length ? offenders.join(", ") : "none";
    facts.vocab_offender_count = offenders.length;
    if (offenders.length >= 3) {
      violations.push({
        check_id: "VOCAB_LEVEL_FIT",
        evidence: `Words above ${level} in the lesson: ${offenders.slice(0, 15).join(", ")}${offenders.length > 15 ? ` (and ${offenders.length - 15} more)` : ""}`,
        fix_hint: `Replace these words with simpler alternatives at or below ${level} (Oxford 3000/5000).`,
      });
    }
  }

  // ── PATTERN-SPECIFIC ──────────────────────────────────────────────────

  if (pattern.id === "documentary-a1-a2-vocabulary") {
    runA1A2VocabularyChecks(html, level, facts, violations);
  } else if (pattern.id === "documentary-a1-a2-grammar") {
    runA1A2GrammarChecks(html, level, facts, violations);
  } else if (pattern.id === "documentary-b1-plus-vocabulary") {
    runB1PlusVocabularyChecks(html, level, facts, violations);
  } else if (pattern.id === "documentary-b1-plus-grammar") {
    runB1PlusGrammarChecks(html, facts, violations);
  } else if (pattern.id === "resource-free-form") {
    runResourceChecks(html, facts, violations);
  }

  return { facts, violations };
};

// ── A1/A2 VOCABULARY ──────────────────────────────────────────────────────

const runA1A2VocabularyChecks = (
  html: string,
  level: CEFRLevel,
  facts: Record<string, string | number | boolean | null>,
  violations: CheckViolation[],
): void => {
  const h3Words = matchAll(html, /<h3>([^<]+)<\/h3>/gi).map((m) =>
    stripTags(m[1]).trim(),
  );
  // <h3>Conversation N</h3> is part of the conversations section — exclude.
  const wordEntries = h3Words.filter((w) => !/^conversation\b/i.test(w));
  facts.h3_word_entry_count = wordEntries.length;

  const [min, max] = level === "A1" ? [6, 8] : [10, 12];
  if (wordEntries.length < min || wordEntries.length > max) {
    violations.push({
      check_id: "A1A2_VOCAB_COUNT",
      evidence: `${wordEntries.length} word entries (expected ${min}-${max} for ${level})`,
      fix_hint: `Adjust the word list to ${min}-${max} entries.`,
    });
  }

  const convDivs = matchAll(
    html,
    /<div\s+[^>]*data-conversation=["']\d+["'][^>]*>/gi,
  );
  facts.conversation_div_count = convDivs.length;
  if (convDivs.length < 2 || convDivs.length > 3) {
    violations.push({
      check_id: "A1A2_VOCAB_HAS_CONVERSATIONS_SECTION",
      evidence: `${convDivs.length} <div data-conversation> elements (expected 2-3)`,
      fix_hint: "Emit a Conversations section with 2-3 conversation containers.",
    });
  }

  // data-voices on every conversation, voices in whitelist.
  for (const m of convDivs) {
    const voiceMatch = m[0].match(/data-voices=(['"])(\{[^]*?\})\1/);
    if (!voiceMatch) {
      violations.push({
        check_id: "A1A2_VOCAB_CONVERSATION_VOICES_VALID",
        evidence: m[0].slice(0, 120),
        fix_hint: "Add data-voices JSON to every conversation <div>.",
      });
      continue;
    }
    try {
      const voices = JSON.parse(voiceMatch[2]) as Record<string, string>;
      const bad = Object.values(voices).filter((v) => !VOICE_IDS.has(v));
      if (bad.length) {
        violations.push({
          check_id: "A1A2_VOCAB_CONVERSATION_VOICES_VALID",
          evidence: `Unknown voice id(s): ${bad.join(", ")}`,
          fix_hint:
            "Use only: onyx, echo, ash, ballad (male) or nova, shimmer, coral, sage (female).",
        });
      }
    } catch {
      violations.push({
        check_id: "A1A2_VOCAB_CONVERSATION_VOICES_VALID",
        evidence: voiceMatch[2].slice(0, 80),
        fix_hint: "data-voices must be valid JSON.",
      });
    }
  }

  // Every target word bolded somewhere in conversations.
  const conversationsHtml = matchAll(
    html,
    /<div\s+[^>]*data-conversation=[^>]*>[\s\S]*?<\/div>/gi,
  )
    .map((m) => m[0])
    .join("\n");
  const missing = wordEntries.filter((w) => {
    const re = new RegExp(`<strong>[^<]*\\b${w}\\b[^<]*</strong>`, "i");
    return !re.test(conversationsHtml);
  });
  if (missing.length) {
    violations.push({
      check_id: "A1A2_VOCAB_ALL_WORDS_BOLDED_IN_CONVERSATIONS",
      evidence: `Missing in conversations: ${missing.join(", ")}`,
      fix_hint:
        "Use every target word at least once inside a conversation, wrapped in <strong>.",
    });
  }

  // Vocab template has no Rule blocks — entire body is student-facing.
  const studentText = stripTags(html).toLowerCase();
  const found = A1_A2_BANNED_METALANGUAGE.filter((w) =>
    new RegExp(`\\b${w}\\b`, "i").test(studentText),
  );
  if (found.length) {
    violations.push({
      check_id: "A1A2_NO_METALANGUAGE",
      evidence: `Banned terms found: ${found.join(", ")}`,
      fix_hint:
        "Rewrite student-facing text to SHOW the form instead of NAMING the rule.",
    });
  }

  if (/<h2>\s*Common mistakes\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "A1A2_NO_COMMON_MISTAKES",
      evidence: "<h2>Common mistakes</h2> section present",
      fix_hint:
        "Remove the Common mistakes section — not used in the A1/A2 vocabulary pattern.",
    });
  }
  if (/<em>\s*Say:?\s*<\/em>/i.test(html)) {
    violations.push({
      check_id: "A1A2_NO_SAY_NOT_PAIRS",
      evidence: "<em>Say:</em> pair present",
      fix_hint:
        "Remove 'Say this, not this' pairs — they belong in the A1/A2 grammar pattern.",
    });
  }

  const cap = level === "A1" ? 8 : 12;
  const lineRe = /<p>\s*<strong>[^<]+:<\/strong>\s*([^<]+)<\/p>/gi;
  let maxLine = 0;
  let worstLine = "";
  for (const m of matchAll(conversationsHtml, lineRe)) {
    const wc = wordCount(stripTags(m[1]));
    if (wc > maxLine) {
      maxLine = wc;
      worstLine = m[1].trim();
    }
  }
  facts.max_conversation_line_words = maxLine;
  if (maxLine > cap) {
    violations.push({
      check_id: "A1A2_VOCAB_SENTENCE_LENGTH",
      evidence: `Longest conversation line: ${maxLine} words ("${worstLine}")`,
      fix_hint: `At ${level}, conversation lines stay under ${cap} words.`,
    });
  }
};

// ── A1/A2 GRAMMAR ─────────────────────────────────────────────────────────

const runA1A2GrammarChecks = (
  html: string,
  level: CEFRLevel,
  facts: Record<string, string | number | boolean | null>,
  violations: CheckViolation[],
): void => {
  if (!/<h2>\s*When you need this\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "A1A2_GRAMMAR_HAS_WHEN_YOU_NEED_THIS",
      evidence: "<h2>When you need this</h2> missing",
      fix_hint: "Add the 'When you need this' section after the title.",
    });
  }

  const formHeaders = matchAll(
    html,
    /<h3>\s*(Affirmative|Negative|Question)\s*<\/h3>/gi,
  );
  facts.form_subblock_count = formHeaders.length;
  if (formHeaders.length === 0) {
    violations.push({
      check_id: "A1A2_GRAMMAR_PER_FORM_SUBBLOCKS",
      evidence: "No <h3>Affirmative|Negative|Question</h3> sub-blocks",
      fix_hint:
        "Emit per-form sub-blocks (Affirmative, Negative, Question) where they apply.",
    });
  }

  if (!/<h2>\s*Say this, not this\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "A1A2_GRAMMAR_HAS_SAY_NOT_PAIRS",
      evidence: "<h2>Say this, not this</h2> missing",
      fix_hint:
        "Add a 'Say this, not this' section with 2-3 <em>Say:</em> ... <em>Not:</em> ... pairs.",
    });
  }

  if (/<h2>\s*Common mistakes\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "A1A2_GRAMMAR_NO_COMMON_MISTAKES",
      evidence: "<h2>Common mistakes</h2> section present",
      fix_hint:
        "Replace with 'Say this, not this' — A1/A2 grammar surfaces errors as Say/Not pairs.",
    });
  }

  // Strip Rule paragraphs (instructor-facing), then scan rest for metalanguage.
  const ruleParaRe = /<p>\s*<em>Rule:<\/em>[^]*?<\/p>/gi;
  const withoutRule = html.replace(ruleParaRe, " ");
  const studentText = stripTags(withoutRule).toLowerCase();
  const found = A1_A2_BANNED_METALANGUAGE.filter((w) =>
    new RegExp(`\\b${w}\\b`, "i").test(studentText),
  );
  if (found.length) {
    violations.push({
      check_id: "A1A2_GRAMMAR_METALANGUAGE_BOUNDARY",
      evidence: `Banned terms outside <em>Rule:</em>: ${found.join(", ")}`,
      fix_hint:
        "Metalanguage is allowed ONLY in the <em>Rule:</em> line. Rewrite student-facing text without it.",
    });
  }

  const cap = level === "A1" ? 12 : 15;
  const candidateBlocks = [
    ...matchAll(withoutRule, /<blockquote>([^]*?)<\/blockquote>/gi),
    ...matchAll(withoutRule, /<p>([^]*?)<\/p>/gi),
  ];
  let maxSentence = 0;
  let worstSentence = "";
  for (const m of candidateBlocks) {
    const sentences = stripTags(m[1])
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of sentences) {
      const wc = wordCount(s);
      if (wc > maxSentence) {
        maxSentence = wc;
        worstSentence = s;
      }
    }
  }
  facts.max_student_sentence_words = maxSentence;
  if (maxSentence > cap) {
    violations.push({
      check_id: "A1A2_GRAMMAR_SENTENCE_LENGTH",
      evidence: `Longest student sentence: ${maxSentence} words ("${worstSentence}")`,
      fix_hint: `At ${level}, student-facing sentences stay under ${cap} words.`,
    });
  }
};

// ── B1+ VOCABULARY ────────────────────────────────────────────────────────

const runB1PlusVocabularyChecks = (
  html: string,
  level: CEFRLevel,
  facts: Record<string, string | number | boolean | null>,
  violations: CheckViolation[],
): void => {
  if (!/<h2>\s*About these words\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "B1PLUS_VOCAB_HAS_ABOUT_SECTION",
      evidence: "<h2>About these words</h2> missing",
      fix_hint: "Open with an 'About these words' intro section.",
    });
  }
  if (!/<h2>\s*Word list\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "B1PLUS_VOCAB_HAS_WORD_LIST_SECTION",
      evidence: "<h2>Word list</h2> missing",
      fix_hint: "Add a 'Word list' section containing the per-word entries.",
    });
  }
  if (!/<h2>\s*Common mistakes\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "B1PLUS_VOCAB_HAS_COMMON_MISTAKES",
      evidence: "<h2>Common mistakes</h2> missing",
      fix_hint:
        "Add a 'Common mistakes' section as a <ul> with 2-4 real learner errors.",
    });
  }

  const h3Count = matchAll(html, /<h3>/gi).length;
  facts.h3_word_entry_count = h3Count;
  const cap = level === "B1" ? 18 : 25;
  if (h3Count > cap) {
    violations.push({
      check_id: "B1PLUS_VOCAB_COUNT_WITHIN_CAP",
      evidence: `${h3Count} word entries (cap ${cap} for ${level})`,
      fix_hint: `Drop the most advanced items to stay within the ${cap}-entry cap.`,
    });
  }
};

// ── B1+ GRAMMAR ───────────────────────────────────────────────────────────

const runB1PlusGrammarChecks = (
  html: string,
  facts: Record<string, string | number | boolean | null>,
  violations: CheckViolation[],
): void => {
  if (!/<h2>\s*What is it\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "B1PLUS_GRAMMAR_HAS_WHAT_IS_IT",
      evidence: "<h2>What is it</h2> missing",
      fix_hint: "Open with a 'What is it' definition section.",
    });
  }
  if (!/<h2>\s*When to use it\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "B1PLUS_GRAMMAR_HAS_WHEN_TO_USE",
      evidence: "<h2>When to use it</h2> missing",
      fix_hint: "Add a 'When to use it' section with 2-4 typical uses as a <ul>.",
    });
  }
  if (!/<h2>\s*Common mistakes\s*<\/h2>/i.test(html)) {
    violations.push({
      check_id: "B1PLUS_GRAMMAR_HAS_COMMON_MISTAKES",
      evidence: "<h2>Common mistakes</h2> missing",
      fix_hint:
        "Add a 'Common mistakes' section as a <ul> with 2-4 real learner errors.",
    });
  }

  const formHeaders = matchAll(
    html,
    /<h3>\s*(Affirmative|Negative|Question)\s*<\/h3>/gi,
  );
  facts.form_subblock_count = formHeaders.length;
  if (formHeaders.length === 0) {
    violations.push({
      check_id: "B1PLUS_GRAMMAR_PER_FORM_SUBBLOCKS",
      evidence: "No <h3>Affirmative|Negative|Question</h3> sub-blocks",
      fix_hint:
        "Emit per-form sub-blocks (Affirmative, Negative, Question) where they apply.",
    });
  }

  // One example per blockquote under the current templates.
  const total = matchAll(html, /<blockquote>[^]*?<\/blockquote>/gi).length;
  facts.total_grammar_examples = total;
  if (total < 5 || total > 8) {
    violations.push({
      check_id: "B1PLUS_GRAMMAR_EXAMPLES_TOTAL",
      evidence: `${total} example sentences across forms (expected 5-8)`,
      fix_hint: "Keep total grammar examples in the 5-8 range.",
    });
  }
};

// ── RESOURCE ──────────────────────────────────────────────────────────────

const runResourceChecks = (
  html: string,
  facts: Record<string, string | number | boolean | null>,
  violations: CheckViolation[],
): void => {
  const h2Count = matchAll(html, /<h2>/gi).length;
  facts.h2_section_count = h2Count;
  if (h2Count < 2) {
    violations.push({
      check_id: "RESOURCE_HAS_SECTIONS",
      evidence: `${h2Count} <h2> sections (need at least 2)`,
      fix_hint: "Split the resource into at least 2 <h2> sections.",
    });
  }

  const forbidden = [
    "Quick check",
    "Try it",
    "Try saying it",
    "Say this, not this",
  ];
  for (const f of forbidden) {
    const re = new RegExp(`<h2>\\s*${f}\\s*</h2>`, "i");
    if (re.test(html)) {
      violations.push({
        check_id: "RESOURCE_NO_EXERCISES",
        evidence: `<h2>${f}</h2> present`,
        fix_hint: "Resource lessons don't include exercise sections.",
      });
      break;
    }
  }
};
