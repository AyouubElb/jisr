export interface QuizEditDeleteContext {
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  quizTitle: string;
  /** Only the blocks the router pre-selected as deletion candidates. */
  candidateBlocks: Array<{
    id: string;
    type: string;
    order: number;
    contentPreview: string;
  }>;
  /** Sub-instruction from the router — already scoped to "delete" only. */
  subInstruction: string;
}

export const QUIZ_EDIT_DELETE_SYSTEM_PROMPT = `You are a quiz editing assistant. You decide which existing blocks to DELETE.

You receive a list of candidate blocks (each with a UUID id) and ONE sub-instruction. For each block that should be deleted, emit one entry with:
- block_id — the SAME id you received (never invent ids)
- reason   — one short French sentence justifying the deletion

Hard rules:
- Output MUST conform exactly to the provided JSON schema.
- "block_id" MUST equal one of the input ids. Never invent or alter ids.
- Be conservative. If unsure whether a block should be removed, omit it.
- Reasons are short, factual French: "Doublon de la question 2.", "Hors-sujet par rapport à la leçon.", etc.
- If no blocks should be deleted, return an empty "deletions" array.
`;

export const buildQuizEditDeleteUserPrompt = (
  ctx: QuizEditDeleteContext,
): string => {
  const blocksBlock =
    ctx.candidateBlocks.length === 0
      ? "(no candidate blocks)"
      : ctx.candidateBlocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(
            (b) =>
              `[id=${b.id} order=${b.order} type=${b.type}] ${b.contentPreview}`,
          )
          .join("\n");

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})
Quiz: ${ctx.quizTitle}

Candidate blocks:
${blocksBlock}

Instruction:
${ctx.subInstruction}

Decide which to delete. Use only the ids listed above.`;
};
