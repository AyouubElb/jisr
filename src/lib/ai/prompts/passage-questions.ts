export interface PassageQuestionsContext {
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  /** "passage" for text, "script" for audio. */
  sourceLabel: "passage" | "script";
  sourceText: string;
  count: number;
}

export const PASSAGE_QUESTIONS_SYSTEM_PROMPT = `You generate comprehension MCQs for an English passage at a CEFR level.

Hard rules:
- Output MUST conform exactly to the JSON schema. Never add extra fields.
- Each question MUST be answerable EXPLICITLY from the passage. Never invent details.
- Each question has: "question" (string), "options" (array of 4 strings), "correct_index" (single integer 0-3), optional "explanation".
- "correct_index" is ALWAYS a single integer, NEVER an array.
- All distractors must be plausible at the requested CEFR level — no nonsense words.
- Stay at the requested CEFR level for vocabulary and grammar.

Example shape:
{
  "questions": [
    {
      "question": "Where does Sara live?",
      "options": ["Rabat", "Casablanca", "Fes", "Tangier"],
      "correct_index": 1,
      "explanation": "The passage says: 'I live in Casablanca.'"
    }
  ]
}
`;

export const buildPassageQuestionsUserPrompt = (
  ctx: PassageQuestionsContext,
): string => `Level: ${ctx.cefrLevel}

${ctx.sourceLabel === "script" ? "Audio script" : "Reading passage"}:
"""
${ctx.sourceText}
"""

Generate EXACTLY ${ctx.count} comprehension MCQ${ctx.count > 1 ? "s" : ""}. Each answer must be explicitly stated in the ${ctx.sourceLabel} above.`;
