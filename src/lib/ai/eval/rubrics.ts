/**
 * Versioned eval rubrics. Source of truth for the shape of `generation_evaluations.scores`.
 *
 * Rules:
 *  - Never edit a shipped rubric in place. Add a new version (e.g. quiz_gen_v2)
 *    and let prior evals stay interpretable against the old key.
 *  - When a new agent ships, append its rubric here and pick a default version
 *    in DEFAULT_RUBRIC_BY_FEATURE.
 *  - Keep keys snake_case; they are stored as-is in the JSONB scores blob.
 *
 * Pass bars and rationale are documented in docs/AI-EVAL-CRITERIA.md — keep
 * the two in sync.
 */
import type { AIFeature } from "../types";
import type { LessonPattern } from "../pedagogy/styles";
import { UNIVERSAL_CHECKS } from "../pedagogy/shared/rubric-base";
import { documentaryA1A2Vocabulary } from "../pedagogy/patterns/documentary-a1-a2-vocabulary";
import { documentaryA1A2Grammar } from "../pedagogy/patterns/documentary-a1-a2-grammar";
import { documentaryB1PlusVocabulary } from "../pedagogy/patterns/documentary-b1-plus-vocabulary";
import { documentaryB1PlusGrammar } from "../pedagogy/patterns/documentary-b1-plus-grammar";
import { resourceFreeForm } from "../pedagogy/patterns/resource-free-form";

export type CriterionType = "scale_1_5" | "boolean";

export interface RubricCriterion {
  key: string;
  label: string;
  description: string;
  type: CriterionType;
  passBar: number | boolean;
  /** When true, a null/undefined value is valid (criterion is N/A for this generation). */
  nullable?: boolean;
}

export interface Rubric {
  key: string;
  feature: AIFeature;
  label: string;
  criteria: readonly RubricCriterion[];
}

export const RUBRICS = {
  quiz_gen_v1: {
    key: "quiz_gen_v1",
    feature: "quiz_gen",
    label: "Génération de quiz — v1",
    criteria: [
      {
        key: "cefr_alignment",
        label: "Alignement CEFR",
        description:
          "Vocabulaire, grammaire et abstraction au niveau demandé — ni au-dessus, ni en dessous.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "instruction_following",
        label: "Respect des consignes",
        description:
          "Nombre et type de blocs conformes au mix demandé. Sujet de focus réellement présent.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "pedagogical_quality",
        label: "Qualité pédagogique",
        description:
          "Distracteurs plausibles, énoncés non ambigus, rubriques exploitables. Pas de questions piège.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "language_correctness",
        label: "Correction linguistique",
        description:
          "Aucune faute de grammaire, d'orthographe ou de tournure. Pass/fail — une seule erreur fait échouer.",
        type: "boolean",
        passBar: true,
      },
    ],
  },

  // Lesson rubrics are AUTO-DERIVED from pattern files below — search for
  // `patternToRubric`. One rubric per (style, level-bucket, type) pattern.

  quiz_gen_v2: {
    key: "quiz_gen_v2",
    feature: "quiz_gen",
    label: "Quiz generation — v2",
    criteria: [
      {
        key: "cefr_alignment",
        label: "CEFR alignment",
        description:
          "Vocabulary, grammar and abstraction at the requested level — neither above nor below.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "instruction_following",
        label: "Instruction following",
        description:
          "Block count and types match the requested mix (passage questions counted separately from standalone). No extra, missing, or wrong-type blocks.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "content_grounding",
        label: "Content grounding",
        description:
          "Questions test what the lesson specifically teaches, not generic filler on the same topic.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "distractor_quality",
        label: "Distractor quality",
        description:
          "Each wrong option reflects a real learner error. No absurd or obvious distractors.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "question_clarity",
        label: "Question clarity",
        description:
          "Unambiguous prompts with exactly one clearly correct answer. No trick questions or unfair cultural assumptions.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "rubric_quality",
        label: "Rubric usability",
        description:
          "For free_text and voice_response blocks: the rubric is precise enough to grade consistently. Null if no such block.",
        type: "scale_1_5",
        passBar: 4,
        nullable: true,
      },
      {
        key: "language_correctness",
        label: "Language correctness",
        description:
          "No grammar, spelling, or phrasing errors. Pass/fail — a single error fails it.",
        type: "boolean",
        passBar: true,
      },
      {
        key: "focus_topic_present",
        label: "Focus topic present",
        description:
          "If a focus topic was requested, it genuinely drives the quiz. True if no focus was requested.",
        type: "boolean",
        passBar: true,
      },
    ],
  },
} as const satisfies Record<string, Rubric>;

// Lesson rubric version — bumped when an atomic check is added or its
// semantics change. Pattern-level granularity, not per-check.
export const LESSON_RUBRIC_VERSION = "v1";

// Auto-derive a Rubric from a LessonPattern: universal checks + the pattern's
// style-specific checks, each rendered as a boolean criterion (pass/fail).
const patternToRubric = (pattern: LessonPattern): Rubric => ({
  key: `${pattern.id}_${LESSON_RUBRIC_VERSION}`,
  feature: "lesson_judge",
  label: `Lesson judge — ${pattern.id}`,
  criteria: [...UNIVERSAL_CHECKS, ...pattern.styleChecks].map((c) => ({
    key: c.id,
    label: c.label ?? c.id,
    description: c.description,
    type: "boolean" as const,
    passBar: true,
  })),
});

const LESSON_PATTERNS: LessonPattern[] = [
  documentaryA1A2Vocabulary,
  documentaryA1A2Grammar,
  documentaryB1PlusVocabulary,
  documentaryB1PlusGrammar,
  resourceFreeForm,
];

const LESSON_RUBRICS: Record<string, Rubric> = Object.fromEntries(
  LESSON_PATTERNS.map((p) => {
    const r = patternToRubric(p);
    return [r.key, r];
  }),
);

// Flat, runtime-mutable map. `RUBRICS` is typed; `ALL_RUBRICS` is the lookup.
const ALL_RUBRICS: Record<string, Rubric> = {
  ...(RUBRICS as Record<string, Rubric>),
  ...LESSON_RUBRICS,
};

export type RubricKey = keyof typeof RUBRICS | string;

const DEFAULT_RUBRIC_BY_FEATURE: Partial<Record<AIFeature, RubricKey>> = {
  quiz_gen: "quiz_gen_v2",
};

export const getDefaultRubricForFeature = (
  feature: string,
): Rubric | null => {
  const key = DEFAULT_RUBRIC_BY_FEATURE[feature as AIFeature];
  return key ? (ALL_RUBRICS[key] ?? null) : null;
};

// lesson_gen needs the input_context to pick its per-pattern rubric.
export const getDefaultRubricForGeneration = (
  feature: string,
  inputContext: Record<string, unknown> | null,
): Rubric | null => {
  if (feature === "lesson_gen" && inputContext) {
    const level = inputContext.courseLevel as string | undefined;
    const lessonType = inputContext.lessonType as string | undefined;
    if (level && lessonType) {
      const bucket = level === "A1" || level === "A2" ? "a1-a2" : "b1-plus";
      const patternId =
        lessonType === "resource"
          ? "resource-free-form"
          : `documentary-${bucket}-${lessonType}`;
      const r = ALL_RUBRICS[`${patternId}_${LESSON_RUBRIC_VERSION}`];
      if (r) return r;
    }
  }
  return getDefaultRubricForFeature(feature);
};

export const getRubric = (key: string): Rubric | null => {
  return ALL_RUBRICS[key] ?? null;
};

/** Default lesson rubric key for a given pattern id. Used by the judge. */
export const getLessonRubricKeyForPattern = (patternId: string): string =>
  `${patternId}_${LESSON_RUBRIC_VERSION}`;

/**
 * Validate a scores object against a rubric. Returns a normalised object
 * with only the criteria the rubric defines, or throws if any required
 * criterion is missing or out of range.
 */
export const validateScores = (
  rubric: Rubric,
  raw: Record<string, unknown>,
): Record<string, number | boolean> => {
  const out: Record<string, number | boolean> = {};
  for (const c of rubric.criteria) {
    const v = raw[c.key];
    if (c.nullable && (v === null || v === undefined)) {
      continue;
    }
    if (v === undefined || v === null) {
      throw new Error(`Critère manquant : ${c.key}`);
    }
    if (c.type === "scale_1_5") {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw new Error(`${c.key} doit être un entier entre 1 et 5`);
      }
      out[c.key] = n;
    } else {
      if (typeof v !== "boolean") {
        throw new Error(`${c.key} doit être un booléen`);
      }
      out[c.key] = v;
    }
  }
  return out;
};

/**
 * True when any 1-5 score is below the pass bar OR a boolean criterion failed.
 * Nullable criteria are skipped (N/A = no failure).
 */
export const isBelowPassBar = (
  rubric: Rubric,
  scores: Record<string, unknown>,
): boolean => {
  for (const c of rubric.criteria) {
    const v = scores[c.key];
    if (c.nullable && (v === null || v === undefined)) continue;
    if (c.type === "scale_1_5") {
      if (typeof v === "number" && v < (c.passBar as number)) return true;
    } else if (c.type === "boolean") {
      if (v === false) return true;
    }
  }
  return false;
};
