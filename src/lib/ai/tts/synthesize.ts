import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { synthesizeWithOpenAI } from "./openai";
import { TTSError } from "./types";

/**
 * High-level TTS entry point. Cache → provider → Storage → cache write.
 * Callers (the quiz-gen route, future lesson-audio routes) get a stable
 * `audio_url` plus metadata, with no idea which provider ran or whether
 * the file was cached.
 */

export interface SynthesizeArgs {
  supabase: SupabaseClient<Database>;
  script: string;
  voiceId?: string;     // default below
  speed?: number;       // default 1.0
  languageCode?: string;
}

export interface SynthesizeResult {
  audioUrl: string;
  storagePath: string;
  voiceId: string;
  speed: number;
  charCount: number;
  durationSeconds: number | null;
  cacheHit: boolean;
}

const STORAGE_BUCKET = "quiz-audio";
const DEFAULT_VOICE = "nova";
const DEFAULT_SPEED = 1.0;
const DEFAULT_LANGUAGE = "en-US";

const cacheKey = (script: string, voiceId: string, speed: number): string =>
  createHash("sha256")
    .update(`${voiceId}|${speed}|${script}`)
    .digest("hex");

export const synthesizeSpeech = async (
  args: SynthesizeArgs,
): Promise<SynthesizeResult> => {
  const voiceId = args.voiceId ?? DEFAULT_VOICE;
  const speed = args.speed ?? DEFAULT_SPEED;
  const languageCode = args.languageCode ?? DEFAULT_LANGUAGE;
  const scriptHash = cacheKey(args.script, voiceId, speed);
  const startedAt = Date.now();

  // ── 1. Cache lookup ──────────────────────────────────────────────────
  const { data: cached } = await args.supabase
    .from("ai_audio_cache")
    .select("audio_url, storage_path, char_count, duration_seconds")
    .eq("script_hash", scriptHash)
    .eq("voice_id", voiceId)
    .eq("speed", speed)
    .maybeSingle();

  if (cached) {
    console.log(
      `[ai.tts] cache HIT | voice: ${voiceId} | speed: ${speed} | chars: ${cached.char_count} | duration: ${cached.duration_seconds}s | latency: ${Date.now() - startedAt}ms`,
    );
    return {
      audioUrl: cached.audio_url,
      storagePath: cached.storage_path,
      voiceId,
      speed,
      charCount: cached.char_count,
      durationSeconds: cached.duration_seconds,
      cacheHit: true,
    };
  }

  // ── 2. TTS provider call ─────────────────────────────────────────────
  const providerStart = Date.now();
  const tts = await synthesizeWithOpenAI({
    script: args.script,
    voiceId,
    speed,
    languageCode,
  });
  const providerLatency = Date.now() - providerStart;

  // ── 3. Upload to Supabase Storage ────────────────────────────────────
  const buffer = Buffer.from(tts.audioBase64, "base64");
  const storagePath = `${scriptHash}.mp3`;

  const { error: uploadError } = await args.supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: tts.mimeType,
      upsert: true, // hash is content-derived, so any collision is byte-identical
    });

  if (uploadError) {
    throw new TTSError(
      `Storage upload failed: ${uploadError.message}`,
      tts.provider,
      uploadError,
    );
  }

  const {
    data: { publicUrl },
  } = args.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // ── 4. Cache write — non-fatal if it fails (file is already in Storage) ─
  const { error: cacheError } = await args.supabase
    .from("ai_audio_cache")
    .insert({
      script_hash: scriptHash,
      voice_id: voiceId,
      speed,
      audio_url: publicUrl,
      storage_path: storagePath,
      char_count: tts.charCount,
      duration_seconds: tts.durationSeconds,
      provider: tts.provider,
      model: tts.model,
    });

  if (cacheError && !/duplicate key/i.test(cacheError.message)) {
    console.error("[ai.tts] cache insert failed:", cacheError.message);
  }

  console.log(
    `[ai.tts] cache MISS | provider: ${tts.provider} | model: ${tts.model} | voice: ${voiceId} | speed: ${speed} | chars: ${tts.charCount} | duration: ${tts.durationSeconds}s | provider latency: ${providerLatency}ms | total: ${Date.now() - startedAt}ms`,
  );

  return {
    audioUrl: publicUrl,
    storagePath,
    voiceId,
    speed,
    charCount: tts.charCount,
    durationSeconds: tts.durationSeconds,
    cacheHit: false,
  };
};
