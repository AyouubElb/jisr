// Pattern loader. Deterministic (style, level, type) → LessonPattern.
// Universal rubric checks are appended automatically so each pattern only
// declares STYLE-SPECIFIC checks.

import type { LessonPattern, PickPatternArgs } from "./styles";
import { levelBucketFor } from "./shared/cefr-rules";
import { UNIVERSAL_CHECKS, type AtomicCheck } from "./shared/rubric-base";

import { documentaryA1A2Vocabulary } from "./patterns/documentary-a1-a2-vocabulary";
import { documentaryA1A2Grammar } from "./patterns/documentary-a1-a2-grammar";
import { documentaryB1PlusVocabulary } from "./patterns/documentary-b1-plus-vocabulary";
import { documentaryB1PlusGrammar } from "./patterns/documentary-b1-plus-grammar";
import { resourceFreeForm } from "./patterns/resource-free-form";

const REGISTRY: LessonPattern[] = [
  documentaryA1A2Vocabulary,
  documentaryA1A2Grammar,
  documentaryB1PlusVocabulary,
  documentaryB1PlusGrammar,
  resourceFreeForm,
];

export class PatternNotFoundError extends Error {
  readonly code = "PATTERN_NOT_FOUND";
  constructor(args: PickPatternArgs) {
    super(
      `No pattern registered for style="${args.style}" level="${args.level}" type="${args.lessonType}". Only "documentary" is implemented in Phase A.`,
    );
    this.name = "PatternNotFoundError";
  }
}

export const pickPattern = (args: PickPatternArgs): LessonPattern => {
  // Resource lessons are style-agnostic — same pattern regardless of declared style.
  if (args.lessonType === "resource") return resourceFreeForm;

  const bucket = levelBucketFor(args.level);
  const match = REGISTRY.find(
    (p) =>
      p.style === args.style &&
      p.levelBucket === bucket &&
      p.lessonType === args.lessonType,
  );

  if (!match) throw new PatternNotFoundError(args);
  return match;
};

// Full rubric = universal checks + style-specific checks. Judge consumes this.
export const rubricFor = (pattern: LessonPattern): AtomicCheck[] => [
  ...UNIVERSAL_CHECKS,
  ...pattern.styleChecks,
];
