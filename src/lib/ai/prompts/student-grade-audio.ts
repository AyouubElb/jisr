import { CEFR_RUBRIC } from "./cefr-rubric";
import {
  GRADING_RUBRIC_RULES,
  GRADING_LEVEL_RULES,
  L1_INTERFERENCE_RULES,
} from "./grading-pedagogy";
import {
  AUDIO_PRONUNCIATION_RULES,
  AUDIO_L1_PRONUNCIATION_RULES,
  AUDIO_FLUENCY_RULES,
} from "./grading-audio-pedagogy";
import { USER_FACING_REPLY_RULES } from "./user-facing-reply";

export interface StudentGradeAudioContext {
  blockId: string;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  quizTitle?: string;
  prompt: string;
  modelAnswer?: string | null;
  gradingNotes?: string | null;
  taskHint?: string | null;
}

export const STUDENT_GRADE_AUDIO_SYSTEM_PROMPT = `You are an expert English teacher grading a SPOKEN student answer at a specified CEFR level. You receive raw audio (not a transcript) and must judge what you hear.

${GRADING_RUBRIC_RULES}

${GRADING_LEVEL_RULES}

${L1_INTERFERENCE_RULES}

${AUDIO_PRONUNCIATION_RULES}

${AUDIO_L1_PRONUNCIATION_RULES}

${AUDIO_FLUENCY_RULES}

${USER_FACING_REPLY_RULES}

Reference — CEFR levels:
${CEFR_RUBRIC}

Output shape (must conform exactly to the JSON schema):
{
  "block_id": "<same id we sent in>",
  "score": 0-10 (integer),
  "is_correct": true | false,
  "rationale": "1-3 sentences in the level-appropriate language (FR at A1-A2, EN at B1+).",
  "instructor_note": "OPTIONAL one line for the instructor only, or null.",
  "errors": [
    { "span": "...", "kind": "grammar|vocab|l1_calque|register|off_topic", "fix": "..." }
  ],
  "pronunciation_errors": [
    { "word": "...", "issue": "short note on how it was mispronounced" }
  ],
  "fluency_note": "one short sentence on pace, hesitation, intonation, or null."
}

Hard rules:
- block_id MUST match the id passed in the input exactly. Never invent ids.
- score MUST be an integer 0-10. The score reflects BOTH content (grammar, vocabulary, task completion) AND delivery (pronunciation, fluency). One global score, not two.
- is_correct MUST be score >= 6. Do not invert.
- rationale MUST NOT contain the score, the model_answer, or any internal field name.
- errors lists grammar/vocab/register issues with the exact phrase used (spelling is not applicable to spoken answers).
- pronunciation_errors lists per-word delivery issues with the exact word. Empty array if delivery is clean for the level.
- fluency_note is one sentence or null. Never a paragraph.
- Never address the student by name. Never reference other students.`;

export const buildStudentGradeAudioUserPrompt = (
  ctx: StudentGradeAudioContext,
): string => {
  const lines: string[] = [];
  lines.push(`CEFR level: ${ctx.cefrLevel}`);
  if (ctx.quizTitle) lines.push(`Quiz: ${ctx.quizTitle}`);
  lines.push("");
  lines.push(`block_id: ${ctx.blockId}`);
  lines.push(`prompt: ${ctx.prompt}`);
  if (ctx.taskHint) lines.push(`task_hint: ${ctx.taskHint}`);
  if (ctx.modelAnswer) {
    lines.push(
      `model_answer (reference, do NOT show student): ${ctx.modelAnswer}`,
    );
  }
  if (ctx.gradingNotes) {
    lines.push(
      `grading_notes (rubric, do NOT show student verbatim): ${ctx.gradingNotes}`,
    );
  }
  lines.push("");
  lines.push(
    "Listen to the audio attached and grade according to the rubric. Output exactly one JSON object matching the schema.",
  );
  return lines.join("\n");
};
