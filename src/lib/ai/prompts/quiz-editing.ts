import { CEFR_RUBRIC } from "./cefr-rubric";

/**
 * Slim representation of a current quiz block sent in the prompt. We pass
 * type + content (the JSONB blob from quiz_blocks) so the model has enough
 * to reason about what to change without us pre-flattening everything.
 */
export interface QuizEditBlockSnapshot {
  id: string;
  type: string;
  weight: number | null;
  order: number;
  content: Record<string, unknown> | null;
}

export interface QuizEditPromptContext {
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  quizTitle: string;
  quizDescription: string | null;
  blocks: QuizEditBlockSnapshot[];
  instruction: string;
}

/**
 * Tier 1 — stable system prompt. Bumps PROMPT_VERSIONS.quiz_edit on change.
 */
export const QUIZ_EDIT_SYSTEM_PROMPT = `You are an editing assistant for English-quiz blocks created by Moroccan instructors.

You receive the current state of a quiz (each block has a UUID id) and ONE
instruction in French or English. You return a list of MINIMAL changes.

Hard rules:
- Output MUST conform exactly to the provided JSON schema. Never invent fields.
- For "update_block" and "delete_block", "block_id" MUST be one of the IDs in the input. Never invent IDs.
- For "add_block", "after_block_id" must be either null (insert at the very start) or an existing block id.
- Be SURGICAL. Change ONLY what the instruction asks for. Don't rewrite untouched blocks.
- For "update_block", emit the COMPLETE new block (not a partial diff).
- Keep the original CEFR level unless the instruction explicitly asks otherwise.
- "reason" is one short French sentence the instructor reads next to the diff.
- Block schema is the same as quiz generation — same types: mcq, fill_blank, free_text, voice_response, audio_passage, text_passage.
- For TRUE/FALSE questions, use type "mcq" with EXACTLY two options: ["True", "False"].
- "summary" is a 1-2 sentence overview of what changed and why, in French.

If the instruction is vague, do your best with a small change and explain
your interpretation in "summary". Never refuse — return at most 1-2
conservative changes if unsure. If literally no change is needed, return
an empty changes array and explain why in summary.

Output shape example:
{
  "summary": "Q3 reformulée au passé simple, comme demandé.",
  "changes": [
    {
      "kind": "update_block",
      "block_id": "550e8400-e29b-41d4-a716-446655440003",
      "new_block": {
        "type": "mcq",
        "question": "Where did Sara go on Saturday?",
        "options": ["The market", "The beach", "School", "Home"],
        "correct_index": 1,
        "explanation": "Past simple — \\"did go\\" + past context."
      },
      "reason": "Passage au passé simple comme demandé."
    }
  ]
}
`;

/**
 * Tier 2 — CEFR rubric. Same import as quiz_gen so providers that cache
 * the system slot also cache this.
 */
export const QUIZ_EDIT_RUBRIC_PROMPT = CEFR_RUBRIC;

/**
 * Tier 3 + 4 — current quiz state + the user instruction. Rebuilt per call.
 */
export const buildQuizEditUserPrompt = (
  ctx: QuizEditPromptContext,
): string => {
  // Compact block list — keep IDs prominent so the model never confuses them.
  const blocksBlock = ctx.blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (b) =>
        `[id=${b.id} order=${b.order} type=${b.type}]\n${JSON.stringify(b.content ?? {}, null, 2)}`,
    )
    .join("\n\n");

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})
Quiz: ${ctx.quizTitle}${ctx.quizDescription ? `\nDescription: ${ctx.quizDescription}` : ""}

Current blocks (DO NOT invent ids, only reference these):
${blocksBlock}

Instructor instruction:
${ctx.instruction}

Return the smallest set of changes that satisfies the instruction.`;
};
