// Lesson judge prompt. The judge does NOT grade overall quality. It walks
// through a list of atomic checks and reports any that fail, with an exact
// quote from the lesson as evidence. Hard checks that already failed in JS
// are pre-supplied as "already-failed" and the judge skips them.

import type { AtomicCheck } from "../pedagogy/shared/rubric-base";
import type { CEFRLevel } from "../pedagogy/shared/cefr-rules";
import type { CheckViolation } from "../lesson-checks";

export interface LessonJudgeContext {
  courseTitle: string;
  courseLevel: CEFRLevel;
  lessonTitle: string;
  lessonType: "grammar" | "vocabulary" | "resource";
  patternId: string;
  patternWhenToUse: string;
  lessonHtml: string;
  /** Atomic checks to evaluate (universal + style-specific, soft only). */
  softChecks: AtomicCheck[];
  /** Pre-computed facts from the deterministic layer. */
  facts: Record<string, string | number | boolean | null>;
  /** Hard checks that already failed in JS — judge does NOT re-evaluate. */
  alreadyFailed: CheckViolation[];
}

export const LESSON_JUDGE_SYSTEM_PROMPT = `You are an evaluator for English lessons. You do NOT rewrite the lesson. You do NOT score overall quality. You ONLY check a list of atomic, binary criteria against the lesson HTML and report which ones FAIL.

HARD OUTPUT RULES:

1. Output is JSON: { "violations": [ { "check_id", "evidence", "fix_hint" } ] }.
2. Every violation MUST include a literal quote from the lesson in "evidence". If you cannot quote it, the violation does NOT count — do not include it.
3. Evidence must be ≥ 10 characters. If shorter, expand the quote with surrounding context.
4. If ALL checks pass, return { "violations": [] }. Do not invent issues.
5. NEVER report a check_id that is in the "already-failed" list — those are confirmed by the deterministic layer; you must not duplicate them.
6. NEVER add a check_id that is not in the list of checks below. Unknown ids are ignored.

EVIDENCE QUALITY:
- Quote the offending sentence or block VERBATIM, copy-paste exact.
- Do not paraphrase. Do not summarize. Do not interpret.
- One violation per real issue. Do not split the same issue across multiple violations.
- If a check is genuinely not applicable to this lesson, omit it. Silence = pass.

DEFAULT TO PASS:
For each check, your default decision is PASS. You only flag a violation when you can quote SPECIFIC text from the lesson that clearly and obviously fails the check. If you cannot point at a specific quote that a human reader would agree proves the violation, the check passes. Silence is the correct output.

FALSE ALARMS ARE WORSE THAN MISSES:
A wrong flag wastes the instructor's time and damages trust in the system. A missed real issue is recoverable — the instructor will catch it during review. When uncertain, pass. Do not flag to seem thorough.

YOU ARE A VERIFIER, NOT A CRITIC. Your job is to confirm violations with evidence, not to find things to improve.

CHECK SCOPE — STRICT:
The "CHECKS TO EVALUATE" list below is the COMPLETE set of criteria you can flag. You MUST NOT:
- Invent new check_ids that are not in the list.
- Flag a violation for an issue that does not match the description of an existing check_id.
- Reuse a check_id for an issue outside its stated meaning (e.g. using a "no fake register notes" check to flag a correct grammar rule).
If you see a problem in the lesson that does not correspond to ANY check_id in the list, you must STAY SILENT about it. It is not your job to surface issues outside the rubric. Any violation whose check_id is not in the list will be discarded by the system.`;

// Per-check description overrides. Injected at decision time so the rule sits
// inside the check the judge is currently evaluating — much harder to ignore
// than a system-prompt-level note far above the lesson HTML.
const CHECK_DESCRIPTION_OVERRIDES: Record<string, string> = {
  PURE_ENGLISH:
    'Pure English throughout. EXEMPT (do NOT flag): proper nouns (Marrakech, Casablanca, Rabat, Tangier, Fes, Agadir, Paris, London, Sara, Ahmed, etc.), currency names (dirhams, euros, dollars, pounds), accepted loanwords (tagine, couscous, souk, hummus, sushi, ballet, cafe, croissant), brand/institution names (Starbucks, BBC). Only flag if you can quote a FULL non-English sentence (e.g. "Je vais au marché"), an explicit inline gloss (e.g. "bread (le pain)", "ticket = billet"), or a foreign-language word used to TEACH meaning. If the only "non-English" word you can quote falls in the exempt categories, PURE_ENGLISH passes — do not flag.',
  NO_CLOSING_REMARKS:
    'No author sign-offs at the lesson end. EXEMPT (do NOT flag): (1) template section markers — "Try these on your own.", "Try it.", "Try saying it." — these introduce exercise sections and are required by the pattern; (2) lines of DIALOGUE inside a conversation (text after "<strong>Speaker:</strong>"). Characters can say "Have a good trip!" — that is character speech, not the author. Only flag if you can quote text that reads like the lesson AUTHOR addressing the student personally to wrap up — e.g. "I hope this helps you understand!", "Good luck with your studies.", "Thanks for reading — see you next time.", "Hope you found this useful." If it is a section header or a character line, the check passes.',
  B1PLUS_GRAMMAR_NO_INVENTED_FORMS:
    'Do NOT invent a form (tense, aspect, voice, comparative, etc.) that does not actually exist in English. REAL violations: continuous form for stative verbs ("I am knowing the answer"), passive for intransitive verbs ("The room was arrived by us"), comparatives for absolute adjectives ("more dead", "more impossible"). EXEMPT (do NOT flag): (1) accurate explanations of forms that genuinely exist (present perfect HAS a negative; past simple HAS a question form; imperatives HAVE a negative — "Don\'t go" is real English); (2) wrong forms quoted INSIDE a <h2>Common mistakes</h2> section to TEACH students what to avoid — these are deliberately incorrect examples paired with corrections, NOT invented forms; (3) wrong forms shown with an arrow "→" or "Wrong: ... Right: ..." pattern — these are pedagogical demonstrations, the lesson is teaching the student to avoid them. Only flag if a wrong form appears in TEACHING text (rule line, affirmative/negative/question examples, when-to-use section) as if it were CORRECT.',
  B1PLUS_GRAMMAR_NO_FAKE_REGISTER_NOTES:
    'Do NOT invent false claims about register, formality, or British/American differences. REAL violations look like: "Shall is more polite than will in American English" (false), "Past simple is informal, present perfect is formal" (false), "Adding -ly makes any word formal" (false). DO NOT flag correct grammar agreement rules (e.g. "Use \'has\' with he/she/it, \'have\' with others" is a subject-verb agreement rule, NOT a register note). DO NOT flag accurate usage notes about time markers, time periods, or word combinations. Only flag if you can quote a statement that makes a claim about REGISTER/FORMALITY/DIALECT that is factually wrong.',
  A1A2_VOCAB_CONVERSATIONS_VARIED:
    'Across ALL conversations in the lesson, no two conversations are the SAME (same setting AND same speaker pair AND same situation). To flag this check, you MUST first read EVERY <div data-conversation> in the lesson, then identify TWO specific conversations that are clear duplicates. Evidence MUST quote BOTH offending conversations (or short fragments from each) so it is obvious which two are repeated — quoting only one conversation is not proof. EXEMPT (do NOT flag): conversations that share a general theme (all travel-related, all home-related) but differ in setting, speakers, or situation — that is the WHOLE POINT of a themed vocabulary lesson. Different scenes within the same theme are VARIED. Only flag clear duplicates, not theme overlap.',
  AMERICAN_ENGLISH_CONSISTENT:
    'The lesson uses ONE English variant consistently. REAL violations require quoting BOTH variants of the same word in the lesson — e.g. "color" AND "colour" both present, "kilometers" AND "metres" both present, "favorite" AND "favourite" both present, "realize" AND "realise" both present. DO NOT flag a lesson that uses purely American spelling (color, kilometer, favorite, realize) or purely British spelling consistently — that is the rule being FOLLOWED, not violated. DO NOT flag based on word CHOICE (sidewalk vs pavement) unless both appear together. Only flag if you can quote two competing spellings of the SAME word existing in the same lesson.',
};

const renderChecks = (checks: AtomicCheck[]): string =>
  checks
    .map((c, i) => {
      const description = CHECK_DESCRIPTION_OVERRIDES[c.id] ?? c.description;
      return `${i + 1}. [${c.id}] (${c.severity}) — ${description}`;
    })
    .join("\n");

const renderFacts = (
  facts: Record<string, string | number | boolean | null>,
): string => {
  const entries = Object.entries(facts);
  if (entries.length === 0) return "(none)";
  return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
};

const renderAlreadyFailed = (violations: CheckViolation[]): string => {
  if (violations.length === 0) return "(none — all deterministic checks passed)";
  return violations
    .map((v) => `- ${v.check_id}: ${v.evidence}`)
    .join("\n");
};

export const buildLessonJudgeUserPrompt = (
  ctx: LessonJudgeContext,
): string => {
  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})
Lesson: ${ctx.lessonTitle}
Lesson type: ${ctx.lessonType}
Pattern: ${ctx.patternId}

═══════════════════════════════════════════════════════════════════
WHEN THIS PATTERN FITS (use as context — do not grade against this verbatim)
═══════════════════════════════════════════════════════════════════

${ctx.patternWhenToUse}

═══════════════════════════════════════════════════════════════════
PRE-COMPUTED FACTS (counted in code, do NOT recount)
═══════════════════════════════════════════════════════════════════

${renderFacts(ctx.facts)}

═══════════════════════════════════════════════════════════════════
ALREADY-FAILED CHECKS (do NOT report these again — judged by code, confirmed failures)
═══════════════════════════════════════════════════════════════════

${renderAlreadyFailed(ctx.alreadyFailed)}

═══════════════════════════════════════════════════════════════════
CHECKS TO EVALUATE
═══════════════════════════════════════════════════════════════════

For EACH check below, decide if the lesson VIOLATES it. If yes, output a violation entry with the check_id, an exact quote from the lesson as evidence, and a short fix hint. Skip any check that passes or is not applicable.

${renderChecks(ctx.softChecks)}

═══════════════════════════════════════════════════════════════════
LESSON HTML
═══════════════════════════════════════════════════════════════════

${ctx.lessonHtml}

═══════════════════════════════════════════════════════════════════

Return ONLY the JSON { "violations": [...] }. No prose outside JSON. No markdown fences.`;
};
