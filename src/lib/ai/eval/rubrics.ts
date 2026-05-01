/**
 * Versioned eval rubrics. Source of truth for the shape of `ai_evaluations.scores`.
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

  quiz_gen_v2: {
    key: "quiz_gen_v2",
    feature: "quiz_gen",
    label: "Génération de quiz — v2",
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
        key: "content_grounding",
        label: "Ancrage dans le contenu",
        description:
          "Les questions testent ce que la leçon enseigne spécifiquement, pas un remplissage générique sur le même sujet.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "distractor_quality",
        label: "Qualité des distracteurs",
        description:
          "Chaque option incorrecte reflète une vraie erreur d'apprenant. Aucun distracteur absurde ou évident.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "question_clarity",
        label: "Clarté des énoncés",
        description:
          "Énoncés non ambigus, une seule réponse clairement correcte. Pas de questions piège ni de suppositions culturelles injustes.",
        type: "scale_1_5",
        passBar: 4,
      },
      {
        key: "rubric_quality",
        label: "Utilité de la rubrique",
        description:
          "Pour les blocs free_text et voice_response : la rubrique est suffisamment précise pour noter de manière cohérente. Null si aucun bloc de ce type.",
        type: "scale_1_5",
        passBar: 4,
        nullable: true,
      },
      {
        key: "language_correctness",
        label: "Correction linguistique",
        description:
          "Aucune faute de grammaire, d'orthographe ou de tournure. Pass/fail — une seule erreur fait échouer.",
        type: "boolean",
        passBar: true,
      },
      {
        key: "focus_topic_present",
        label: "Sujet de focus présent",
        description:
          "Si un sujet de focus a été demandé, il dirige réellement le quiz. True si aucun focus demandé.",
        type: "boolean",
        passBar: true,
      },
    ],
  },
} as const satisfies Record<string, Rubric>;

export type RubricKey = keyof typeof RUBRICS;

const DEFAULT_RUBRIC_BY_FEATURE: Partial<Record<AIFeature, RubricKey>> = {
  quiz_gen: "quiz_gen_v2",
};

export const getDefaultRubricForFeature = (
  feature: string,
): Rubric | null => {
  const key = DEFAULT_RUBRIC_BY_FEATURE[feature as AIFeature];
  return key ? RUBRICS[key] : null;
};

export const getRubric = (key: string): Rubric | null => {
  return (RUBRICS as Record<string, Rubric>)[key] ?? null;
};

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
