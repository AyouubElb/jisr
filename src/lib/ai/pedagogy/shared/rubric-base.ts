/**
 * Universal rubric checks — every lesson, regardless of style/level/type, is
 * graded against these. Pattern files append style-specific checks on top.
 *
 * Each check is ATOMIC and BINARY. Evidence-required: if the judge claims a
 * violation, it must quote the offending text. Checks that can be computed
 * deterministically in JS are marked with `deterministic: true` — the judge
 * never sees those, the code does.
 */

export interface AtomicCheck {
  id: string;
  /** Optional human label for the admin UI. Falls back to the id. */
  label?: string;
  /** One-line description of what passes vs fails. The judge reads this. */
  description: string;
  /**
   * "soft" = needs an LLM (pedagogy fit, naturalness, vocab simplicity).
   * "hard" = deterministic, computed in lesson-checks.ts and passed to the
   *          judge prompt as a pre-computed fact (no LLM judgment needed).
   */
  kind: "soft" | "hard";
  /** Action when the check fails. */
  severity: "must_fix" | "should_fix";
}

export const UNIVERSAL_CHECKS: AtomicCheck[] = [
  {
    id: "HTML_TAG_WHITELIST",
    description:
      "Every tag used is in the whitelist: h1-h4, p, ul, ol, li, strong, em, u, s, a, br, hr, blockquote, code, pre, span. No <html>, <body>, <head>, <script>, <style>, <table>, <img> without explicit pattern allowance.",
    kind: "hard",
    severity: "must_fix",
  },
  {
    id: "NO_PLACEHOLDER_TEXT",
    description:
      "No literal placeholder text: '...', 'TBD', 'TODO', '[à compléter]', 'lorem ipsum'.",
    kind: "hard",
    severity: "must_fix",
  },
  {
    id: "NO_H1",
    description:
      "Content does not start with or contain an <h1> tag (the editor renders the title above the content).",
    kind: "hard",
    severity: "must_fix",
  },
  {
    id: "PURE_ENGLISH",
    description:
      "The lesson body contains no translations into other languages. French / Arabic / Darija only appears if the pattern explicitly allows it (it does not, by default).",
    kind: "soft",
    severity: "must_fix",
  },
  {
    id: "AMERICAN_ENGLISH_CONSISTENT",
    description:
      "Spelling is American English consistently. No mixing colour/color, organise/organize, learnt/learned in the same lesson.",
    kind: "soft",
    severity: "should_fix",
  },
  {
    id: "NO_CLOSING_REMARKS",
    description:
      "No letter-style closing remarks ('I hope this helps', 'Good luck', 'Enjoy learning').",
    kind: "soft",
    severity: "should_fix",
  },
];
