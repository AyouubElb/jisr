import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import {
  DEFAULT_MODEL,
  MAX_OUTPUT_TOKENS,
  PROMPT_VERSIONS,
  type ModelKey,
} from "../constants";
import { hashPromptInput } from "../hash";
import { cheapRepair } from "../repair";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  LESSON_EDIT_SYSTEM_PROMPT,
  buildLessonEditUserPrompt,
} from "../prompts/lesson-edit";
import {
  aiLessonEditOutputSchema,
  type AILessonEditOutput,
} from "../schemas/lesson-edit.schema";
import {
  splitLessonBlocks,
  renderNumberedBlocks,
  applyBlockChanges,
  buildDiffHtmlFromOps,
  LessonBlockApplyError,
} from "../lesson-blocks";
import { normalizeHtml } from "../html-normalize";

export interface RunLessonEditArgs {
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  lessonTitle: string;
  lessonType: "grammar" | "vocabulary" | "resource";
  /** Current lesson HTML — already normalized by the service. */
  currentContent: string;
  chatHistory: string;
  instruction: string;
  modelKey?: ModelKey;
}

// What the generator returns once the block ops are applied. The service
// logs/persists this; the chat UI shows the diff.
export type LessonEditResult =
  | { kind: "reply"; summary: string }
  | {
      kind: "edit";
      summary: string;
      /** Full lesson HTML after applying the ops, normalized. */
      newContent: string;
      /** Diff-marked HTML for the editor preview. */
      diffHtml: string;
      /** Op count + which original blocks changed — for telemetry/logs. */
      changeCount: number;
      changedBlocks: number[];
      insertedAfter: number[];
    };

export const runLessonEdit = async (
  args: RunLessonEditArgs,
): Promise<AICallResult<LessonEditResult>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.lesson_edit;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.lesson_edit;

  // Split the lesson into numbered blocks — the model picks numbers from this.
  const blocks = splitLessonBlocks(args.currentContent);
  const numberedBlocks = renderNumberedBlocks(blocks);

  const systemPrompt = LESSON_EDIT_SYSTEM_PROMPT;
  const userPrompt = buildLessonEditUserPrompt({
    courseTitle: args.courseTitle,
    courseLevel: args.courseLevel,
    lessonTitle: args.lessonTitle,
    lessonType: args.lessonType,
    numberedBlocks,
    blockCount: blocks.length,
    chatHistory: args.chatHistory,
    instruction: args.instruction,
  });
  const inputHash = hashPromptInput(
    `lesson_edit\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  // Input log — the numbered block list the model picks from. Eyeball the
  // ops in the output log against these numbers.
  console.log("[lesson-edit] === LLM INPUT ===");
  console.log("[lesson-edit] model:", modelKey, "/ promptVersion:", promptVersion);
  console.log(`[lesson-edit] instruction: "${args.instruction}"`);
  console.log(
    `[lesson-edit] lesson sent as ${blocks.length} blocks:\n${numberedBlocks || "(empty)"}`,
  );
  if (args.chatHistory.trim()) {
    console.log(`[lesson-edit] chatHistory sent:\n${args.chatHistory.trim()}`);
  }

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiLessonEditOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_edit,
      experimental_repairText: async ({ text, error }) => {
        repairAttempts += 1;
        if (repairAttempts > 2) return null;
        const cheap = cheapRepair(text);
        if (repairAttempts === 1 && cheap !== text) return cheap;
        const { text: repaired } = await generateText({
          model,
          system:
            "You fix JSON so it matches a provided schema. Output ONLY the corrected JSON, no prose, no markdown fences.",
          prompt: `The following JSON failed schema validation.

Validation error:
${error.message}

Original JSON:
${text}

Return the corrected JSON only. Keep as much of the original content as possible — fix only what the error requires.`,
          temperature: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_edit,
        });
        return cheapRepair(repaired.trim());
      },
    });

    // Output log — the ops, not a full lesson. Compare block numbers here
    // against the numbered list in the input log.
    console.log("[lesson-edit] === LLM OUTPUT ===");
    console.log("[lesson-edit] kind:", object.kind, "/ repairAttempts:", repairAttempts);
    console.log(`[lesson-edit] summary: "${object.summary}"`);
    if (object.kind === "edit") {
      console.log(
        `[lesson-edit] ${object.changes.length} ops:\n${JSON.stringify(object.changes, null, 2)}`,
      );
    }

    const result = buildResult(object, blocks);

    return {
      output: result,
      usage: {
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
      },
      latencyMs: Date.now() - startedAt,
      model: modelKey,
      provider,
      promptVersion,
      retryCount: repairAttempts,
      schemaValid: true,
      inputHash,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const rawText = NoObjectGeneratedError.isInstance(err) ? err.text : undefined;
    console.log("[lesson-edit] === LLM OUTPUT (FAILED) ===");
    console.log("[lesson-edit] error:", message);
    if (rawText) console.log(`[lesson-edit] raw text:\n${rawText}`);
    throw new AIGenerationError(
      `Lesson edit failed: ${message}`,
      "lesson_edit",
      err,
      rawText,
    );
  }
};

// Apply the model's ops to the original blocks, normalize, build the diff.
// A LessonBlockApplyError (bad block number / conflicting ops) is wrapped so
// the route surfaces it — the model referenced a block that doesn't fit.
const buildResult = (
  object: AILessonEditOutput,
  blocks: ReturnType<typeof splitLessonBlocks>,
): LessonEditResult => {
  if (object.kind === "reply") {
    return { kind: "reply", summary: object.summary };
  }

  let applied;
  try {
    applied = applyBlockChanges(blocks, object.changes);
  } catch (err) {
    if (err instanceof LessonBlockApplyError) {
      throw new AIGenerationError(
        `Lesson edit produced invalid block ops: ${err.message}`,
        "lesson_edit",
        err,
      );
    }
    throw err;
  }

  // Diff is built from the ops directly — no comparison guessing. The
  // ops are ground truth; untouched blocks stay byte-identical, no false
  // "deleted + re-added" on unrelated sections.
  return {
    kind: "edit",
    summary: object.summary,
    newContent: normalizeHtml(applied.html),
    diffHtml: buildDiffHtmlFromOps(blocks, object.changes),
    changeCount: object.changes.length,
    changedBlocks: applied.changedBlocks,
    insertedAfter: applied.insertedAfter,
  };
};
