/**
 * Single-call LLM timeout. No retry — we use models reliable enough that a
 * timeout means the request is genuinely stuck (queue, network, runaway
 * output). Route handlers translate AITimeoutError into a 408 + a copy that
 * tells the user to retry or shrink the request.
 */

export const LLM_TIMEOUT_MS = 45000;

// AI routes set `export const maxDuration = 60` (literal — Next segment config
// can't read an imported value). 60 > LLM_TIMEOUT_MS so our 45s timeout fires
// first; Hobby caps at 60, Pro allows 300.

export class AITimeoutError extends Error {
  readonly code = "AI_TIMEOUT";
  constructor(public readonly timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms.`);
    this.name = "AITimeoutError";
  }
}

export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number = LLM_TIMEOUT_MS,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new AITimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(t);
        resolve(value);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
};
