import { CEFR_RUBRIC } from "./cefr-rubric";
import {
  GRADING_RUBRIC_RULES,
  GRADING_LEVEL_RULES,
  L1_INTERFERENCE_RULES,
} from "./grading-pedagogy";
import { USER_FACING_REPLY_RULES } from "./user-facing-reply";

/** Shape of a single answer the grader has to score in one attempt. */
export interface StudentGradeAnswer {
  /** Quiz block id — surfaced in the output so the orchestrator can join back. */
  blockId: string;
  /** "free_text" or "voice" — the only two types this agent grades. */
  blockType: "free_text" | "voice";
  /** The question prompt the student saw. */
  prompt: string;
  /** Optional reference answer the instructor wrote when authoring the quiz. */
  modelAnswer?: string | null;
  /** Optional rubric / grading notes the instructor wrote. */
  gradingNotes?: string | null;
  /** Optional min/max word target (free_text) or max seconds (voice). */
  taskHint?: string | null;
  /** The student's typed answer, OR the Whisper transcript of their voice answer. */
  studentAnswer: string;
  /** True when studentAnswer came from speech-to-text (low confidence = more lenient). */
  wasTranscribed?: boolean;
  /** Whisper confidence 0-1 when wasTranscribed is true; ignored otherwise. */
  transcriptConfidence?: number;
}

export interface StudentGradeContext {
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  /** Optional course / quiz titles — orient the grader without leaking IDs. */
  quizTitle?: string;
  answers: StudentGradeAnswer[];
}

export const STUDENT_GRADE_SYSTEM_PROMPT = `You are an expert English teacher grading short student answers at a specified CEFR level.

You receive an array of answers. For EACH answer in the input, output exactly one entry in "grades" with the matching block_id. Never drop an answer, never add one. The order of "grades" should mirror the order of the input answers.

${GRADING_RUBRIC_RULES}

${GRADING_LEVEL_RULES}

${L1_INTERFERENCE_RULES}

${USER_FACING_REPLY_RULES}

Reference — CEFR levels:
${CEFR_RUBRIC}

Transcript handling (voice answers):
- A voice answer is supplied as a transcript produced by automatic speech recognition. It may contain mishears.
- When was_transcribed is true and transcript_confidence is below 0.8, be LENIENT on small surface errors (a/an, plural -s, exact word) that could plausibly be transcription artefacts.
- Do not lower a score because of likely ASR mishears. Grade the meaning the student communicated, not the literal transcript.
- If the transcript is largely unintelligible, score 2-3 with a rationale asking the student to record again in a quieter environment.

Output shape (must conform exactly to the JSON schema):
{
  "grades": [
    {
      "block_id": "<same id we sent in>",
      "score": 0-10 (integer),
      "is_correct": true | false,
      "rationale": "1-3 sentences in the level-appropriate language (FR at A1-A2, EN at B1+).",
      "instructor_note": "OPTIONAL one line for the instructor only.",
      "errors": [
        { "span": "...", "kind": "grammar|vocab|spelling|l1_calque|register|off_topic", "fix": "..." }
      ]
    }
  ]
}

Hard rules:
- block_id MUST match one of the ids passed in the input exactly. Never invent ids.
- score MUST be an integer 0-10. Never use decimals or 0-100 scales.
- is_correct MUST be score >= 6. Do not invert.
- rationale MUST NOT contain the score, the model_answer, or any internal field name.
- errors array MAY be empty (perfect answers have no errors).
- Never address the student by name. Never reference other students. Never apologize on the student's behalf.`;

export const buildStudentGradeUserPrompt = (ctx: StudentGradeContext): string => {
  const header = `CEFR level: ${ctx.cefrLevel}
${ctx.quizTitle ? `Quiz: ${ctx.quizTitle}` : ""}

Grade each answer below. Output one entry per answer, matching by block_id.`;

  const items = ctx.answers
    .map((a, idx) => {
      const lines: string[] = [];
      lines.push(`--- Answer ${idx + 1} ---`);
      lines.push(`block_id: ${a.blockId}`);
      lines.push(`block_type: ${a.blockType}`);
      lines.push(`prompt: ${a.prompt}`);
      if (a.taskHint) lines.push(`task_hint: ${a.taskHint}`);
      if (a.modelAnswer) lines.push(`model_answer (reference, do NOT show student): ${a.modelAnswer}`);
      if (a.gradingNotes) lines.push(`grading_notes (rubric, do NOT show student verbatim): ${a.gradingNotes}`);
      if (a.wasTranscribed) {
        const conf =
          typeof a.transcriptConfidence === "number"
            ? a.transcriptConfidence.toFixed(2)
            : "unknown";
        lines.push(`was_transcribed: true (confidence=${conf}) — be lenient on small surface errors that may be ASR mishears.`);
      }
      const answerText = a.studentAnswer.trim().length === 0
        ? "(empty answer)"
        : a.studentAnswer;
      lines.push(`student_answer:\n"""\n${answerText}\n"""`);
      return lines.join("\n");
    })
    .join("\n\n");

  return `${header}\n\n${items}`;
};
