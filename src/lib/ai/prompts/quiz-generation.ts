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
    voice_response: number;
    audio_passage: number;
    text_passage: number;
  };
  questionsPerPassage: number;
  studentMistakes?: Array<{ wrong: string; correct: string }>;
}

/**
 * Tier 1 — stable system prompt. Changes here must bump the prompt version
 * constant so telemetry stays honest.
 */
export const QUIZ_GEN_SYSTEM_PROMPT = `You are a CEFR-aligned English quiz generator for Moroccan learners.

Rules:
- Questions MUST match the requested CEFR level (see rubric).
- MCQ distractors must be plausible but unambiguous — exactly ONE option is correct.
- For TRUE/FALSE questions, use type "mcq" with EXACTLY two options: ["True", "False"]. Do NOT invent a separate true_false type.
- Fill-blank is a sentence with a single blank marked "___". Provide 2–4 options; exactly one is correct.
- Free-text questions must include a concrete grading rubric AND a model answer.
- Voice-response questions are speaking prompts. Same shape as free_text (rubric + model_answer); the student's answer will be recorded audio. Phrase the question for SPEAKING (e.g. "Talk about…", "Describe out loud…"), not writing.
- Audio passages: write a natural-sounding spoken script (60-180 words at the requested CEFR level), then write the comprehension MCQs whose answers are explicitly verifiable from the script. Do NOT reference details that aren't in the script.
- Text passages: write a short reading passage (80-220 words at the requested CEFR level) followed by comprehension MCQs whose answers are explicitly verifiable from the passage. Same "stay grounded in the passage" rule as audio.
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
    },
    {
      "type": "text_passage",
      "passage": "The medina of Fes is one of the largest car-free urban areas in the world. Narrow streets wind between old houses, small shops, and traditional workshops. Visitors can buy leather goods, spices, and handmade pottery. The famous tanneries are still in use today, just as they were hundreds of years ago.",
      "caption": "A short text about the medina of Fes.",
      "questions": [
        {
          "question": "Why is the medina of Fes special?",
          "options": ["It has many cars", "It is car-free", "It is very modern"],
          "correct_index": 1
        },
        {
          "question": "What can visitors buy in the medina?",
          "options": ["Phones and computers", "Leather, spices and pottery", "Cars and bicycles"],
          "correct_index": 1
        }
      ]
    },
    {
      "type": "voice_response",
      "question": "Talk about your last weekend in 4 to 6 sentences. Use the past simple.",
      "rubric": "1. Uses past simple correctly for at least 4 verbs. 2. Sentences are connected (then, after that, finally). 3. Pronunciation is clear enough to understand.",
      "model_answer": "Last Saturday I went to the beach with my friends. We swam in the sea and played football on the sand. After that we ate sandwiches. In the evening I watched a movie at home. Sunday I studied for my English test."
    },
    {
      "type": "mcq",
      "question": "True or False: The verb 'to go' is regular in the past simple.",
      "options": ["True", "False"],
      "correct_index": 1,
      "explanation": "'go' is irregular — past simple is 'went', not 'goed'."
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
      ? `\n- ${ctx.mix.audio_passage} audio_passage block(s), each with a 60-180 word spoken script in English plus ${ctx.questionsPerPassage} comprehension MCQs whose answers are explicitly stated in the script`
      : "";

  const textPassageLine =
    ctx.mix.text_passage > 0
      ? `\n- ${ctx.mix.text_passage} text_passage block(s), each with an 80-220 word reading passage in English plus ${ctx.questionsPerPassage} comprehension MCQs whose answers are explicitly stated in the passage`
      : "";

  const voiceLine =
    ctx.mix.voice_response > 0
      ? `\n- ${ctx.mix.voice_response} voice_response (speaking prompt with rubric + model spoken answer; phrase for SPEAKING)`
      : "";

  return `Course: ${ctx.courseTitle} (Level: ${ctx.courseLevel})

Lesson(s) provided:
${lessonsBlock}
${mistakesBlock}
Task — generate a draft quiz with ${ctx.numQuestions} gradable questions:
- ${ctx.mix.mcq} MCQ (single correct answer; use ["True","False"] options for true/false)
- ${ctx.mix.fill_blank} fill-blank (sentence with one "___" and answer options)
- ${ctx.mix.free_text} free-text (open written response with a clear rubric)${voiceLine}${audioLine}${textPassageLine}

${focusLine}

Keep questions tightly aligned with the lesson content. Do not introduce grammar or vocabulary above the stated CEFR level.`;
};
