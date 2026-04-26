/**
 * Provider-agnostic TTS contract. Add a second provider (ElevenLabs,
 * OpenAI) by creating another file that returns the same shape and
 * wiring it into `synthesize.ts`.
 */
export interface TTSRequest {
  script: string;
  voiceId: string;     // provider-specific voice name
  speed: number;       // 0.80 .. 1.20
  languageCode: string; // BCP-47, e.g. 'en-US'
}

export interface TTSResult {
  audioBase64: string;       // raw provider output, before storage upload
  mimeType: string;          // 'audio/mpeg'
  charCount: number;         // billed unit
  durationSeconds: number | null;
  provider: "google";        // widen union when adding providers
  model: string;             // 'chirp3-hd'
}

export class TTSError extends Error {
  readonly code = "TTS_FAILED";
  constructor(
    message: string,
    public provider: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "TTSError";
  }
}
