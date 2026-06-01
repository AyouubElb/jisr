import { MODELS, PROMPT_VERSIONS, type ModelKey } from "../constants";
import { hashPromptInput } from "../hash";
import { AIGenerationError } from "../types";
import type { AICallResult, AIProvider } from "../types";
import {
  STUDENT_GRADE_AUDIO_SYSTEM_PROMPT,
  buildStudentGradeAudioUserPrompt,
  type StudentGradeAudioContext,
} from "../prompts/student-grade-audio";
import {
  studentGradeAudioOutputSchema,
  type StudentGradeAudioOutput,
} from "../schemas/student-grade-audio.schema";

const ENDPOINT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}

export interface GradeStudentAudioArgs {
  context: StudentGradeAudioContext;
  audioBase64: string;
  audioMimeType: string;
  modelKey: ModelKey;
}

export const gradeStudentAudio = async (
  args: GradeStudentAudioArgs,
): Promise<AICallResult<StudentGradeAudioOutput>> => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set",
      "voice_grade",
    );
  }

  const config = MODELS[args.modelKey];
  if (config.provider !== "google") {
    throw new AIGenerationError(
      `Audio grading requires a Google model; got ${config.provider}`,
      "voice_grade",
    );
  }

  const promptVersion = PROMPT_VERSIONS.student_grade;
  const systemPrompt = STUDENT_GRADE_AUDIO_SYSTEM_PROMPT;
  const userPrompt = buildStudentGradeAudioUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `student-grade-audio\n${promptVersion}\n${systemPrompt}\n${userPrompt}\n${args.audioBase64.slice(0, 64)}`,
  );

  console.log("[student-grade-audio] === MODEL INPUT ===");
  console.log("[student-grade-audio] model:", args.modelKey);
  console.log("[student-grade-audio] block_id:", args.context.blockId);
  console.log(
    "[student-grade-audio] audio_kb:",
    Math.round((args.audioBase64.length * 0.75) / 1024),
  );

  const startedAt = Date.now();

  const res = await fetch(
    `${ENDPOINT_BASE}/${config.modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt },
              {
                inlineData: {
                  mimeType: args.audioMimeType,
                  data: args.audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new AIGenerationError(
      `Gemini HTTP ${res.status}: ${errText.slice(0, 500)}`,
      "voice_grade",
    );
  }

  const payload = (await res.json()) as GeminiResponse;
  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.log("[student-grade-audio] === MODEL OUTPUT (raw, JSON FAILED) ===");
    console.log("[student-grade-audio] raw text:\n" + rawText);
    throw new AIGenerationError(
      `Voice-grade failed: JSON parse error (${err instanceof Error ? err.message : "unknown"})`,
      "voice_grade",
      err,
      rawText,
    );
  }

  const validation = studentGradeAudioOutputSchema.safeParse(parsed);
  if (!validation.success) {
    console.log("[student-grade-audio] === MODEL OUTPUT (schema FAILED) ===");
    console.log("[student-grade-audio] raw text:\n" + rawText);
    throw new AIGenerationError(
      `Voice-grade failed: schema validation (${validation.error.message})`,
      "voice_grade",
      validation.error,
      rawText,
    );
  }

  console.log("[student-grade-audio] === MODEL OUTPUT (parsed) ===");
  console.log(
    "[student-grade-audio] score:",
    validation.data.score,
    "pronunciation_errors:",
    validation.data.pronunciation_errors.length,
  );

  const provider: AIProvider = config.provider;

  return {
    output: validation.data,
    usage: {
      inputTokens: payload.usageMetadata?.promptTokenCount ?? null,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null,
      cacheReadTokens: payload.usageMetadata?.cachedContentTokenCount ?? null,
    },
    latencyMs,
    model: args.modelKey,
    provider,
    promptVersion,
    retryCount: 0,
    schemaValid: true,
    inputHash,
    error: null,
  };
};
