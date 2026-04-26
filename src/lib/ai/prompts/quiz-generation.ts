import { CEFR_RUBRIC } from "./cefr-rubric";

/**
 * Shape of the context we feed the quiz-gen prompt. Assembled server-side
 * from Supabase (course + selected lessons + optional student mistakes).
 */
export interface QuizGenPromptContext {
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  lessons: Array<{ title: string; type: string; content: string }>;
  focusTopic?: string;
  numQuestions: number;
  mix: {
    mcq: number;
    fill_blank: number;
    free_text: number;
    audio_passage: number;
  };
  questionsPerAudioPassage: number;
  studentMistakes?: Array<{ wrong: string; correct: string }>;
}

/**
 * Tier 1 — stable system prompt. Changes here must bump the prompt version
 * constant so telemetry stays honest.
 */
export const QUIZ_GEN_SYSTEM_PROMPT = `You are a CEFR-aligned English quiz generator for Moroccan learners.

Rules:
- Questions MUST match the requested CEFR level (see rubric).
- MCQ distractors must be plausible but unambiguous — exactly ONE option is correct unless allow_multiple is true.
- Fill-blank is a sentence with a single blank marked "___". Provide 2–4 options; exactly one is correct.
- Free-text questions must include a concrete grading rubric AND a model answer.
- Audio passages: write a natural-sounding spoken script (60-180 words at the requested CEFR level), then write the comprehension MCQs whose answers are explicitly verifiable from the script. Do NOT reference details that aren't in the script.
- Avoid culturally foreign examples; prefer contexts Moroccan learners relate to (daily life, travel in Morocco, local school scenarios) — do not force it.
- All question/answer text MUST be in English. Optional grading notes can be bilingual French–English.
- Output MUST conform exactly to the provided JSON schema. Never invent extra fields.

Use this EXACT output shape. One small example showing each block type:

{
  "title": "Present Simple — basics",
  "description": "Short quiz on the present simple for A1 learners.",
  "cefr_targeted": "A1",
  "skills_covered": ["present simple", "subject-verb agreement"],
  "blocks": [
    {
      "type": "mcq",
      "question": "Which sentence is correct?",
      "options": ["She go to school.", "She goes to school.", "She going to school.", "She gone to school."],
      "correct_index": 1,
      "explanation": "3rd-person singular adds -s."
    },
    {
      "type": "fill_blank",
      "sentence": "My brother ___ football every Saturday.",
      "options": ["play", "plays", "playing", "played"],
      "correct_index": 1
    },
    {
      "type": "free_text",
      "question": "Describe your daily routine in 3-4 sentences using the present simple.",
      "rubric": "1. Uses present simple correctly for at least 3 verbs. 2. Subject-verb agreement is correct. 3. Sentences describe a routine.",
      "model_answer": "I wake up at 7 AM. I eat breakfast with my family. Then I go to school. In the evening I study and read a book."
    },
    {
      "type": "audio_passage",
      "script": "Hello! My name is Sara. I am a student in Casablanca. Every morning I wake up at seven o'clock. I eat breakfast with my brother. Then I take the bus to school. I have four classes before lunch. My favourite class is English because the teacher is very kind.",
      "voice_hint": "neutral_female",
      "caption": "Sara talks about her morning routine.",
      "questions": [
        {
          "question": "What time does Sara wake up?",
          "options": ["6 o'clock", "7 o'clock", "8 o'clock"],
          "correct_index": 1
        },
        {
          "question": "How does Sara go to school?",
          "options": ["By car", "By bus", "On foot"],
          "correct_index": 1
        }
      ]
    }
  ]
}

Notes on the shape:
- "options" is an array of plain strings (the visible labels).
- "correct_index" is the 0-based index of the correct option inside "options".
- Do NOT return options as objects, do NOT return parallel arrays, do NOT invent fields like "option_text" or "correct_option_id".
- For "audio_passage": each item in "questions" is { question, options, correct_index, explanation? } — no "type" field on inner questions.
- "voice_hint" must be one of: "neutral_female", "neutral_male", "slow_clear".
`;

/**
 * Tier 2 — stable rubric (same every call). Joined with the system prompt
 * so providers that cache only the system slot still cache it.
 */
export const QUIZ_GEN_RUBRIC_PROMPT = CEFR_RUBRIC;

/**
 * Tier 3 + 4 — lesson context + dynamic user request. Rebuilt per call.
 * Kept as one function so callers don't have to juggle formatting.
 */
export const buildQuizGenUserPrompt = (ctx: QuizGenPromptContext): string => {
  const lessonsBlock = ctx.lessons
    .map(
      (l, i) =>
        `--- Lesson ${i + 1} (${l.type}) — ${l.title} ---\n${l.content.trim()}`,
    )
    .join("\n\n");

  const mistakesBlock =
    ctx.studentMistakes && ctx.studentMistakes.length > 0
      ? `\nRecent student mistakes to target (don't copy verbatim, use them as signal):\n${ctx.studentMistakes
          .map((m) => `- Wrote "${m.wrong}" (correct: "${m.correct}")`)
          .join("\n")}\n`
      : "";

  const focusLine = ctx.focusTopic
    ? `Focus topic: ${ctx.focusTopic}`
    : "Focus topic: general coverage of the lesson(s)";

  const audioLine =
    ctx.mix.audio_passage > 0
      ? `\n- ${ctx.mix.audio_passage} audio_passage block(s), each with a 60-180 word spoken script in English plus ${ctx.questionsPerAudioPassage} comprehension MCQs whose answers are explicitly stated in the script`
      : "";

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})

Lesson(s) provided:
${lessonsBlock}
${mistakesBlock}
Task — generate a draft quiz with ${ctx.numQuestions} gradable questions:
- ${ctx.mix.mcq} MCQ (single correct answer unless obvious)
- ${ctx.mix.fill_blank} fill-blank (sentence with one "___" and answer options)
- ${ctx.mix.free_text} free-text (open response with a clear rubric)${audioLine}

${focusLine}

Keep questions tightly aligned with the lesson content. Do not introduce grammar or vocabulary above the stated CEFR level.`;
};
