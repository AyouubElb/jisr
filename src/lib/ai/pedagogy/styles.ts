/**
 * Pedagogy library — pattern shape + style registry.
 *
 * One pattern = one (style, level-bucket, type) recipe. Same export shape
 * across patterns so the generator and judge consume them uniformly.
 */
import type { AtomicCheck } from "./shared/rubric-base";
import type { CEFRLevel, LevelBucket } from "./shared/cefr-rules";

export type LessonStyle = "documentary" | "clt" | "presentative" | "classical";
export type LessonType = "grammar" | "vocabulary" | "resource";

export interface StyleMeta {
  id: LessonStyle;
  label: string;
  description: string;
  whenToUse: string;
}

// Only `documentary` is implemented in Phase A. The other three are stubs
// for the registry — patterns are added when an instructor asks.
export const STYLES: Record<LessonStyle, StyleMeta> = {
  documentary: {
    id: "documentary",
    label: "Documentary",
    description: "Reference document the student re-reads at home.",
    whenToUse:
      "Lesson is a revision artifact. Clear sections, examples in their own blockquotes, pattern-driven at A1/A2, documentation pattern at B1+.",
  },
  clt: {
    id: "clt",
    label: "Communicative (CLT)",
    description: "Task-based, communication-first lessons.",
    whenToUse: "NOT IMPLEMENTED YET.",
  },
  presentative: {
    id: "presentative",
    label: "Presentative",
    description: "Slide-deck-style lesson the instructor walks through.",
    whenToUse: "NOT IMPLEMENTED YET.",
  },
  classical: {
    id: "classical",
    label: "Classical grammar",
    description: "Rule-first, drill-heavy grammar lessons.",
    whenToUse: "NOT IMPLEMENTED YET.",
  },
};

// Worked example used as few-shot. Keep real and short; add only after sister validation.
export interface PatternExample {
  note: string;
  title: string;
  scope: string;
  html: string;
}

export interface LessonPattern {
  id: string;
  style: LessonStyle;
  levelBucket: LevelBucket;
  lessonType: LessonType;
  whenToUse: string;
  templateBlock: string;
  examples: PatternExample[];
  /** Universal checks (UNIVERSAL_CHECKS) are appended by the loader. */
  styleChecks: AtomicCheck[];
}

export interface PickPatternArgs {
  style: LessonStyle;
  level: CEFRLevel;
  lessonType: LessonType;
}
