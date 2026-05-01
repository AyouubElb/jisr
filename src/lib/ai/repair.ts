/**
 * Cheap text repairs applied before falling back to a second LLM call.
 * Add new repairs here as we observe new failure modes.
 */

/** Strip surrounding ```json ... ``` or ``` ... ``` fences. */
export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1].trim() : trimmed;
}

/**
 * Drop text_passage.questions arrays that contain malformed entries (missing
 * options or correct_index). Common Gemini failure: model adds comprehension
 * questions without options. Without this, Zod rejects the whole block; with
 * this, the passage itself is preserved.
 */
export function stripMalformedPassageQuestions(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  if (!parsed || typeof parsed !== "object") return text;

  let mutated = false;
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (
      obj.type === "text_passage" &&
      Array.isArray(obj.questions) &&
      obj.questions.some((q) => {
        if (!q || typeof q !== "object") return true;
        const qq = q as Record<string, unknown>;
        return (
          !Array.isArray(qq.options) ||
          typeof qq.correct_index !== "number"
        );
      })
    ) {
      delete obj.questions;
      mutated = true;
    }
    Object.values(obj).forEach(visit);
  };
  visit(parsed);
  return mutated ? JSON.stringify(parsed) : text;
}

/** Run every cheap repair in order. */
export function cheapRepair(text: string): string {
  return stripMalformedPassageQuestions(stripJsonFences(text));
}
