import { CEFR_RUBRIC } from "./cefr-rubric";

export interface QuizEditAddContext {
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  quizTitle: string;
  quizDescription: string | null;
  /** Compact summary of existing blocks so the model can pick a sensible insert position. */
  existingBlocks: Array<{
    id: string;
    type: string;
    order: number;
    contentPreview: string;
  }>;
  /** Sub-instruction from the router — already scoped to "add" only. */
  subInstruction: string;
}

/**
 * Tier 1 — system prompt for the "add blocks" tool. Mirrors quiz_gen rules
 * since adding a block is the same act as generating one.
 */
export const QUIZ_EDIT_ADD_SYSTEM_PROMPT = `You are a quiz authoring assistant. You add NEW blocks to an existing English quiz for Moroccan learners.

Hard rules:
- Output MUST conform EXACTLY to the JSON schema below. Never invent fields, never add extra fields.
- DO NOT include "id", "order", "allow_multiple", "correct_options", "prompt", or any field not shown in the examples below.
- For TRUE/FALSE questions, use type "mcq" with EXACTLY two options: ["True", "False"].
- STAY ON SUBJECT. Every block you emit must align with the quiz subject (course title + level + quiz title + description). Only go off-subject when the sub_instruction EXPLICITLY says so (e.g. "ajoute une question hors-sujet sur X").

text_passage rules (CRITICAL — read carefully):
- A text_passage with NO questions is a valid, common output. It is just a reading paragraph for the student.
- DEFAULT: emit text_passage WITHOUT a "questions" field. OMIT the field entirely.
- ONLY include "questions" if the user EXPLICITLY uses words like "questions de compréhension", "comprehension questions", "MCQs about the passage", "questions sur le passage", or similar.
- If you DO include "questions", every question MUST have "question", "options" (array of 4 strings), AND "correct_index" (single integer). NEVER emit a question with only the "question" field.
- "Add a passage", "ajoute un texte", "add a reading", "ajoute un paragraphe" → NO questions field. Just passage + caption.

Other rules:
- If the user asks for a question ABOUT an EXISTING passage already in the quiz: emit a STANDALONE "mcq" block. DO NOT emit a new "text_passage" block. Only emit "text_passage" when the user explicitly asks for a NEW reading passage.
- Match the course CEFR level. Distractors must reflect real, plausible learner errors at this level.
- "reasons" array MUST have the same length as "blocks". One short French sentence per block.
- Do NOT copy example sentences from the lesson content verbatim.

EXACT BLOCK SHAPES (copy these field names exactly):

mcq:
{
  "type": "mcq",
  "question": "What is the past simple of 'go'?",
  "options": ["went", "goed", "gone", "going"],
  "correct_index": 0,
  "explanation": "Past simple of 'go' is irregular: 'went'."
}

fill_blank:
{
  "type": "fill_blank",
  "sentence": "She ___ to school yesterday.",
  "options": ["went", "go", "goes", "gone"],
  "correct_index": 0,
  "explanation": "Past simple after 'yesterday'."
}

free_text:
{
  "type": "free_text",
  "question": "Describe your last weekend in 3-5 sentences.",
  "rubric": "1) Uses past simple correctly. 2) At least 3 sentences. 3) Coherent narrative.",
  "model_answer": "Last weekend I went to the park with my friends. We played football...",
  "min_words": 30,
  "max_words": 80
}

voice_response:
{
  "type": "voice_response",
  "question": "Tell me about your daily routine.",
  "rubric": "1) Uses present simple. 2) Mentions at least 4 activities. 3) Clear pronunciation.",
  "model_answer": "I wake up at 7am. I have breakfast at 7:30...",
  "max_seconds": 60
}

text_passage (plain reading paragraph, no comprehension MCQs — OMIT "questions" entirely):
{
  "type": "text_passage",
  "passage": "Sara is a student. She lives in Casablanca with her family...",
  "caption": "A short story about Sara."
}

text_passage (with comprehension MCQs — include "questions" array):
{
  "type": "text_passage",
  "passage": "Sara is a student...",
  "caption": "A short story about Sara.",
  "questions": [
    { "question": "Where does Sara live?", "options": ["Rabat", "Casablanca", "Fes", "Marrakech"], "correct_index": 1 }
  ]
}

section (header that organises the quiz into named parts — NOT a question):
{
  "type": "section",
  "title": "Partie 2 — Compréhension écrite",
  "description": "Lisez le passage puis répondez aux questions."
}

GOOD vs BAD section examples:

GOOD — clear, scoped, organising:
  { "type": "section", "title": "Partie 1 — Vocabulaire", "description": "Choisissez la meilleure option." }
GOOD — short, no description (description is optional):
  { "type": "section", "title": "Grammaire : passé simple" }

BAD — section used as a question (sections are NEVER questions):
  { "type": "section", "title": "What is the past simple of 'go'?" }   ← use type "mcq" instead
BAD — empty title:
  { "type": "section", "title": "" }
BAD — title with full sentence/paragraph (titles are short labels):
  { "type": "section", "title": "In this section we will study how to use the past simple tense in everyday situations..." }
BAD — added when not asked. Only emit a section block when the user explicitly asks for a header/divider/section.

SCENARIO — "MCQ about an existing text passage":
The quiz already contains a text passage block. The user wants to add ONE OR MORE comprehension questions about it.

GOOD output (single standalone mcq block):
{
  "reasons": ["Question MCQ de compréhension sur le passage existant."],
  "blocks": [
    {
      "type": "mcq",
      "question": "According to the passage, where does Ali live?",
      "options": ["Marrakech", "Casablanca", "Rabat", "Fes"],
      "correct_index": 0,
      "explanation": "Le passage dit : 'I live in Marrakech.'"
    }
  ]
}

BAD output (NEVER do this — adds a new passage instead of an mcq):
{
  "reasons": ["Ajout d'un passage avec questions."],
  "blocks": [
    {
      "type": "text_passage",
      "passage": "Some new passage...",
      "questions": [{ "question": "..." }]
    }
  ]
}

→ When the sub_instruction mentions "MCQ about the passage" / "qcm sur le passage", emit a STANDALONE "mcq" block referring back to the passage's content. The passage is ALREADY in the quiz — do not duplicate it.

COMMON MISTAKES — DO NOT do these:

❌ correct_index as an array:
  WRONG:  "correct_index": [0]
  WRONG:  "correct_index": [0, 1, 2]
  RIGHT:  "correct_index": 0
  → "correct_index" is ALWAYS a single integer (the position of the correct option). NEVER an array, even when there are multiple questions.

❌ Putting "options" outside each question in text_passage:
  WRONG:
  {
    "type": "text_passage",
    "questions": [{ "question": "..." }, { "question": "..." }],
    "options": ["A", "B"],
    "correct_index": [0, 1]
  }
  RIGHT:
  {
    "type": "text_passage",
    "questions": [
      { "question": "Q1?", "options": ["A","B","C","D"], "correct_index": 0 },
      { "question": "Q2?", "options": ["A","B","C","D"], "correct_index": 1 }
    ]
  }
  → "options" and "correct_index" go INSIDE each question. Each question has its OWN options and correct_index.

❌ Adding a new text_passage when the user asked for a simple MCQ:
  WRONG: User says "add an MCQ" → you emit a text_passage with questions inside.
  RIGHT: User says "add an MCQ" → emit a STANDALONE "mcq" block. Only emit "text_passage" when the user explicitly asks for a reading passage.

If the instruction is vague, add 1 conservative block that matches the lesson level — default to type "mcq" unless a passage or other type is asked for.
`;

export const QUIZ_EDIT_ADD_RUBRIC_PROMPT = CEFR_RUBRIC;

export const buildQuizEditAddUserPrompt = (
  ctx: QuizEditAddContext,
): string => {
  const existingBlock =
    ctx.existingBlocks.length === 0
      ? "(quiz is empty — insert at top)"
      : ctx.existingBlocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(
            (b) =>
              `[id=${b.id} order=${b.order} type=${b.type}] ${b.contentPreview}`,
          )
          .join("\n");

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})
Quiz: ${ctx.quizTitle}${ctx.quizDescription ? `\nDescription: ${ctx.quizDescription}` : ""}

Existing blocks (for context — DO NOT touch them, only ADD new blocks; pick "insert_after_block_id" from these ids or null):
${existingBlock}

What to add:
${ctx.subInstruction}

Emit only the new blocks. Match the level. One short French reason per new block.`;
};
