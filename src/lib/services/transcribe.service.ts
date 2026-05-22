import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const WHISPER_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_MODEL = "whisper-1";
const AUDIO_BUCKET = "materials";

export class TranscriptionError extends Error {
  readonly code = "TRANSCRIPTION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language: string | null;
  durationSeconds: number | null;
}

interface WhisperSegment {
  avg_logprob?: number;
  no_speech_prob?: number;
}

interface WhisperVerboseResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}

const fileExtensionFromPath = (path: string): string => {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return "webm";
  return path.slice(dot + 1).toLowerCase();
};

// Map Whisper avg_logprob (-1.5..0, higher = more confident) to 0..1.
const logprobToConfidence = (avg: number): number => {
  const clamped = Math.max(-1.5, Math.min(0, avg));
  return Math.round(((clamped + 1.5) / 1.5) * 100) / 100;
};

export const transcribeAnswer = async (
  supabase: SupabaseClient<Database>,
  audioPath: string,
): Promise<TranscriptionResult> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TranscriptionError("OPENAI_API_KEY is not set");
  }
  if (!audioPath || audioPath.trim().length === 0) {
    throw new TranscriptionError("audio path is empty");
  }

  const { data: blob, error: dlError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .download(audioPath);

  if (dlError || !blob) {
    throw new TranscriptionError(
      dlError?.message ?? `Failed to download ${audioPath}`,
    );
  }

  const ext = fileExtensionFromPath(audioPath);
  const file = new File([blob], `answer.${ext}`, {
    type: blob.type || "audio/webm",
  });

  const form = new FormData();
  form.append("file", file);
  form.append("model", WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  form.append("language", "en");

  const res = await fetch(WHISPER_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new TranscriptionError(
      `Whisper HTTP ${res.status}: ${errText.slice(0, 500)}`,
    );
  }

  const payload = (await res.json()) as WhisperVerboseResponse;

  const segments = payload.segments ?? [];
  let confidence = 1;
  if (segments.length > 0) {
    const sum = segments.reduce(
      (acc, s) => acc + (typeof s.avg_logprob === "number" ? s.avg_logprob : 0),
      0,
    );
    confidence = logprobToConfidence(sum / segments.length);
  }

  return {
    transcript: payload.text?.trim() ?? "",
    confidence,
    language: payload.language ?? null,
    durationSeconds:
      typeof payload.duration === "number"
        ? Math.round(payload.duration * 10) / 10
        : null,
  };
};
