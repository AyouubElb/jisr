import { TTSError, type TTSRequest, type TTSResult } from "./types";

const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";

export const synthesizeWithOpenAI = async (
  req: TTSRequest,
): Promise<TTSResult> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TTSError("OPENAI_API_KEY is not set", "openai");
  }

  const body = {
    model: OPENAI_TTS_MODEL,
    input: req.script,
    voice: req.voiceId,
    response_format: "mp3",
    speed: req.speed,
  };

  const res = await fetch(OPENAI_TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new TTSError(
      `OpenAI TTS HTTP ${res.status}: ${errText.slice(0, 500)}`,
      "openai",
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  // Rough estimate; OpenAI doesn't return duration.
  const estimatedSeconds = req.script.length / 2.5 / req.speed;

  return {
    audioBase64,
    mimeType: "audio/mpeg",
    charCount: req.script.length,
    durationSeconds: Math.round(estimatedSeconds * 10) / 10,
    provider: "openai",
    model: OPENAI_TTS_MODEL,
  };
};
