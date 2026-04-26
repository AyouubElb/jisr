import { TTSError, type TTSRequest, type TTSResult } from "./types";

/**
 * Google Cloud Text-to-Speech via REST API. We hit the endpoint directly
 * instead of pulling `@google-cloud/text-to-speech` because:
 *   - One fetch is simpler than the SDK's auth dance for a serverless route
 *   - No extra dependency, no heavy gRPC bundle
 *   - Same auth model as the rest of our Google AI calls (API key)
 *
 * Default voice: Chirp 3 HD — Google's best general-purpose English voice
 * in early 2026. Free tier: 1M chars / month at no cost.
 */

const GOOGLE_TTS_ENDPOINT =
  "https://texttospeech.googleapis.com/v1/text:synthesize";

const GOOGLE_TTS_MODEL = "chirp3-hd";

export const synthesizeWithGoogle = async (
  req: TTSRequest,
): Promise<TTSResult> => {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new TTSError(
      "GOOGLE_TTS_API_KEY is not set",
      "google",
    );
  }

  const body = {
    input: { text: req.script },
    voice: {
      languageCode: req.languageCode,
      name: req.voiceId,
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: req.speed,
    },
  };

  const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new TTSError(
      `Google TTS HTTP ${res.status}: ${errText.slice(0, 500)}`,
      "google",
    );
  }

  const json = (await res.json()) as { audioContent?: string };
  if (!json.audioContent) {
    throw new TTSError("Google TTS returned no audioContent", "google");
  }

  // Google does not return duration; rough estimate from script length
  // (avg 2.5 chars/sec at speed=1.0 for English narration).
  const estimatedSeconds = (req.script.length / 2.5) / req.speed;

  return {
    audioBase64: json.audioContent,
    mimeType: "audio/mpeg",
    charCount: req.script.length,
    durationSeconds: Math.round(estimatedSeconds * 10) / 10,
    provider: "google",
    model: GOOGLE_TTS_MODEL,
  };
};
