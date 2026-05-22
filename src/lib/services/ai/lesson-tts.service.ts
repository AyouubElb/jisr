import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { synthesizeSpeech } from "@/lib/ai/tts/synthesize";

// OpenAI gpt-4o-mini-tts billing: $0.60 per 1M characters → 0.00006 cents/char.
const TTS_COST_CENTS_PER_CHAR = 0.00006;
const TTS_MODEL = "gpt-4o-mini-tts";

const DEFAULT_VOICE = "nova";
const SPEED = 1.0;

const MALE_VOICES = ["onyx", "echo", "ash", "ballad"] as const;
const FEMALE_VOICES = ["nova", "shimmer", "coral", "sage"] as const;
type Voice = (typeof MALE_VOICES)[number] | (typeof FEMALE_VOICES)[number];

const KNOWN_VOICES = new Set<string>([...MALE_VOICES, ...FEMALE_VOICES]);

export type LessonAudioKind = "sentence" | "conversation";

export interface LessonAudioLine {
  speaker: string;
  text: string;
  voice: string;
  hash: string;
  audioUrl: string;
  cacheHit: boolean;
}

export interface LessonAudioEntry {
  kind: LessonAudioKind;
  /** For sentences: the spoken text. For conversations: the data-conversation id. */
  key: string;
  /** Sentences only. */
  hash?: string;
  text?: string;
  audioUrl?: string;
  cacheHit?: boolean;
  /** Conversations only — ordered lines, each with its own voice + audio. */
  lines?: LessonAudioLine[];
}

export interface SynthesizeLessonAudioResult {
  entries: LessonAudioEntry[];
  generated: number;
  reused: number;
}

const hashFor = (voice: string, text: string): string =>
  createHash("sha256").update(`${voice}|${SPEED}|${text}`).digest("hex");

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

// ── Voice inference ─────────────────────────────────────────────────────────

const MALE_LABELS = new Set([
  "man", "boy", "father", "dad", "papa", "son", "brother", "husband", "uncle",
  "grandfather", "grandpa", "waiter", "doctor", "teacher", "barber", "chef",
  "driver", "mister", "sir", "guy", "male",
]);
const FEMALE_LABELS = new Set([
  "woman", "girl", "mother", "mom", "mama", "daughter", "sister", "wife", "aunt",
  "grandmother", "grandma", "waitress", "nurse", "lady", "madam", "ma'am",
  "miss", "mrs", "ms", "female",
]);

const MALE_FIRST_NAMES = new Set([
  "ahmed", "ali", "omar", "youssef", "karim", "mehdi", "anas", "yassine",
  "hamza", "rachid", "khalid", "said", "amine", "ismail", "samir", "tarek",
  "hassan", "hussein", "abdellah", "abdelaziz", "john", "james", "tom", "mike",
  "david", "paul", "mark", "peter",
]);
const FEMALE_FIRST_NAMES = new Set([
  "fatima", "aisha", "khadija", "nadia", "zineb", "salma", "houda", "leila",
  "amira", "samira", "rachida", "hayat", "imane", "yasmine", "sara", "sarah",
  "asma", "kenza", "meryem", "mary", "anna", "emma", "lisa", "jane", "lucy",
]);

/** Best-effort: derive a voice from a speaker label without an LLM. */
const inferVoiceForLabel = (
  rawLabel: string,
  position: number,
  conversationKey: string,
): Voice => {
  const label = rawLabel.trim().toLowerCase();

  // Honorific prefix wins ("Mr. Smith", "Mrs. Jones", "Ms. X").
  if (/^mr\.?\s/i.test(rawLabel)) return pickMale(position, conversationKey);
  if (/^(mrs|ms|miss)\.?\s/i.test(rawLabel))
    return pickFemale(position, conversationKey);

  // Dictionary hits on the full label.
  if (MALE_LABELS.has(label)) return pickMale(position, conversationKey);
  if (FEMALE_LABELS.has(label)) return pickFemale(position, conversationKey);

  // First word of multi-word labels ("the waiter", "old man").
  const firstWord = label.split(/\s+/)[0] ?? "";
  if (MALE_LABELS.has(firstWord)) return pickMale(position, conversationKey);
  if (FEMALE_LABELS.has(firstWord)) return pickFemale(position, conversationKey);

  // First names.
  if (MALE_FIRST_NAMES.has(firstWord))
    return pickMale(position, conversationKey);
  if (FEMALE_FIRST_NAMES.has(firstWord))
    return pickFemale(position, conversationKey);

  // Fallback: alternate by position so two-speaker convs always contrast.
  return position % 2 === 0
    ? pickMale(position, conversationKey)
    : pickFemale(position, conversationKey);
};

// Rotate within each gender pool so 3+ speakers of the same gender get
// distinct voices. Conversation key seeds the rotation so re-saves are stable.
const seedFromKey = (key: string): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const pickMale = (position: number, convKey: string): Voice =>
  MALE_VOICES[(seedFromKey(convKey) + Math.floor(position / 2)) % MALE_VOICES.length]!;
const pickFemale = (position: number, convKey: string): Voice =>
  FEMALE_VOICES[(seedFromKey(convKey) + Math.floor(position / 2)) % FEMALE_VOICES.length]!;

/** Build (or fix) the speaker → voice map for a conversation. */
const resolveVoiceMap = (
  declared: Record<string, string> | null,
  speakers: string[],
  conversationKey: string,
): Record<string, string> => {
  const map: Record<string, string> = {};
  let position = 0;
  for (const speaker of speakers) {
    const declaredVoice = declared?.[speaker];
    if (declaredVoice && KNOWN_VOICES.has(declaredVoice)) {
      map[speaker] = declaredVoice;
    } else {
      map[speaker] = inferVoiceForLabel(speaker, position, conversationKey);
    }
    position += 1;
  }
  return map;
};

const parseVoicesAttr = (raw: string | null): Record<string, string> | null => {
  if (!raw) return null;
  try {
    const decoded = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
};

// ── HTML extraction ─────────────────────────────────────────────────────────

interface ConversationLineUnit {
  speaker: string;
  text: string;
  voice: string;
}

interface ConversationUnit {
  kind: "conversation";
  key: string;
  lines: ConversationLineUnit[];
}

interface SentenceUnit {
  kind: "sentence";
  key: string;
  text: string;
}

type ExtractedUnit = ConversationUnit | SentenceUnit;

export const extractLessonUnits = (html: string): ExtractedUnit[] => {
  if (!html) return [];

  const units: ExtractedUnit[] = [];
  const seenSentences = new Set<string>();
  const pushSentence = (text: string): void => {
    if (text.length < 2) return;
    if (seenSentences.has(text)) return;
    seenSentences.add(text);
    units.push({ kind: "sentence", key: text, text });
  };

  const conversationSpans: Array<[number, number]> = [];

  // ── Pass 1: conversations ──
  const convRe =
    /<div\b([^>]*\bdata-conversation\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/div>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = convRe.exec(html)) !== null) {
    const attrs = cm[1] ?? "";
    const id = cm[2] ?? "";
    const inner = cm[3] ?? "";
    conversationSpans.push([cm.index, cm.index + cm[0].length]);

    const voicesAttrMatch = attrs.match(
      /data-voices\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
    );
    const declared = parseVoicesAttr(
      voicesAttrMatch ? voicesAttrMatch[1] ?? voicesAttrMatch[2] ?? null : null,
    );

    const speakerOrder: string[] = [];
    const lineDrafts: Array<{ speaker: string; text: string }> = [];

    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pRe.exec(inner)) !== null) {
      const pInner = pm[1] ?? "";
      const speakerMatch = pInner.match(
        /^\s*<strong\b[^>]*>\s*([^<:]+):\s*<\/strong>\s*([\s\S]+)$/i,
      );
      if (!speakerMatch) continue;

      const speaker = normalize(stripTags(speakerMatch[1] ?? ""));
      let spoken = normalize(stripTags(speakerMatch[2] ?? ""));
      if (!speaker || !spoken) continue;

      // End with terminal punctuation for cleaner TTS prosody.
      if (!/[.!?]$/.test(spoken)) spoken = `${spoken}.`;

      if (!speakerOrder.includes(speaker)) speakerOrder.push(speaker);
      lineDrafts.push({ speaker, text: spoken });
    }

    if (lineDrafts.length === 0) continue;

    const voiceMap = resolveVoiceMap(declared, speakerOrder, id);
    const lines: ConversationLineUnit[] = lineDrafts.map((l) => ({
      speaker: l.speaker,
      text: l.text,
      voice: voiceMap[l.speaker] ?? DEFAULT_VOICE,
    }));

    units.push({ kind: "conversation", key: id, lines });
  }

  const insideConversation = (pos: number): boolean =>
    conversationSpans.some(([s, e]) => pos >= s && pos < e);

  // ── Pass 2: standalone sentences (blockquotes + speaker <p>s outside convs) ──
  const bqRe = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
  let m: RegExpExecArray | null;
  while ((m = bqRe.exec(html)) !== null) {
    if (insideConversation(m.index)) continue;
    const inner = m[1] ?? "";
    const lines = inner.split(/<br\s*\/?>(?!\s*<\/)/i);
    for (const line of lines) pushSentence(normalize(stripTags(line)));
  }

  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = pRe.exec(html)) !== null) {
    if (insideConversation(m.index)) continue;
    const inner = m[1] ?? "";
    const speakerMatch = inner.match(
      /^\s*<strong\b[^>]*>\s*([^<:]+):\s*<\/strong>\s*([\s\S]+)$/i,
    );
    if (!speakerMatch) continue;
    pushSentence(normalize(stripTags(speakerMatch[2] ?? "")));
  }

  return units;
};

// ── Orphan-conversation cleaner ─────────────────────────────────────────────

const escapeAttr = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * Wrap orphan <h3>Conversation N</h3> + speaker <p> siblings in
 * <div data-conversation="N" data-voices="…">. Adds inferred voices so
 * legacy / manual lessons get multi-voice playback too.
 */
export const wrapOrphanConversations = (
  html: string,
): { html: string; wrapped: number } => {
  if (!html) return { html, wrapped: 0 };

  let nextId = 1;
  const existingIds = html.matchAll(
    /<div\b[^>]*\bdata-conversation\s*=\s*["']([^"']+)["']/gi,
  );
  for (const e of existingIds) {
    const n = Number(e[1]);
    if (Number.isFinite(n) && n >= nextId) nextId = n + 1;
  }

  const wrappedSpans: Array<[number, number]> = [];
  const wrappedRe = /<div\b[^>]*\bdata-conversation[^>]*>[\s\S]*?<\/div>/gi;
  let wm: RegExpExecArray | null;
  while ((wm = wrappedRe.exec(html)) !== null) {
    wrappedSpans.push([wm.index, wm.index + wm[0].length]);
  }
  const insideExisting = (pos: number): boolean =>
    wrappedSpans.some(([s, e]) => pos >= s && pos < e);

  const h3Re = /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
  const tagAtRe = /<(\/?)([a-z][a-z0-9]*)\b[^>]*?>/gi;

  const replacements: Array<{
    start: number;
    end: number;
    replacement: string;
  }> = [];
  let m: RegExpExecArray | null;

  while ((m = h3Re.exec(html)) !== null) {
    const h3Start = m.index;
    const h3End = m.index + m[0].length;
    if (insideExisting(h3Start)) continue;

    const headingText = stripTags(m[1] ?? "");
    if (!/conversation\s*\d+/i.test(headingText)) continue;

    let cursor = h3End;
    let lastConsumed = h3End;
    const speakerOrder: string[] = [];

    while (true) {
      tagAtRe.lastIndex = cursor;
      const t = tagAtRe.exec(html);
      if (!t) break;
      if (insideExisting(t.index)) break;

      const between = html.slice(cursor, t.index);
      if (between.replace(/\s+/g, "").length > 0) break;

      const tag = t[2]?.toLowerCase() ?? "";
      const isClose = t[1] === "/";
      if (!isClose && tag === "p") {
        const closeRe = /<\/p\s*>/gi;
        closeRe.lastIndex = t.index + t[0].length;
        const close = closeRe.exec(html);
        if (!close) break;
        if (insideExisting(close.index)) break;

        const pInner = html.slice(t.index + t[0].length, close.index);
        const speakerMatch = pInner.match(
          /^\s*<strong\b[^>]*>\s*([^<:]+):\s*<\/strong>/i,
        );
        if (!speakerMatch) break;
        const speaker = normalize(stripTags(speakerMatch[1] ?? ""));
        if (speaker && !speakerOrder.includes(speaker))
          speakerOrder.push(speaker);

        cursor = close.index + close[0].length;
        lastConsumed = cursor;
        continue;
      }
      break;
    }

    if (speakerOrder.length === 0) continue;

    const id = String(nextId++);
    const voiceMap = resolveVoiceMap(null, speakerOrder, id);
    const voicesAttr = escapeAttr(JSON.stringify(voiceMap));
    const block = html.slice(h3Start, lastConsumed);
    const replacement = `<div data-conversation="${id}" data-voices="${voicesAttr}">${block}</div>`;
    replacements.push({ start: h3Start, end: lastConsumed, replacement });

    h3Re.lastIndex = lastConsumed;
  }

  if (replacements.length === 0) return { html, wrapped: 0 };

  let out = html;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i]!;
    out = out.slice(0, r.start) + r.replacement + out.slice(r.end);
  }
  return { html: out, wrapped: replacements.length };
};

// ── Cache-only fetch (student viewer) ───────────────────────────────────────

const collectHashes = (units: ExtractedUnit[]): string[] => {
  const hashes: string[] = [];
  for (const u of units) {
    if (u.kind === "sentence") {
      hashes.push(hashFor(DEFAULT_VOICE, u.text));
    } else {
      for (const line of u.lines) hashes.push(hashFor(line.voice, line.text));
    }
  }
  return hashes;
};

export const fetchLessonAudio = async (
  supabase: SupabaseClient<Database>,
  lessonId: string,
): Promise<SynthesizeLessonAudioResult> => {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, content")
    .eq("id", lessonId)
    .single();
  if (error || !lesson) throw new Error("Lesson not found");

  const units = extractLessonUnits(lesson.content ?? "");
  if (units.length === 0) return { entries: [], generated: 0, reused: 0 };

  const hashes = collectHashes(units);
  const { data: cached } = await supabase
    .from("ai_audio_cache")
    .select("script_hash, audio_url")
    .in("script_hash", hashes)
    .eq("speed", SPEED);

  const urlByHash = new Map<string, string>();
  for (const row of cached ?? []) urlByHash.set(row.script_hash, row.audio_url);

  const entries: LessonAudioEntry[] = [];
  let reused = 0;
  for (const u of units) {
    if (u.kind === "sentence") {
      const hash = hashFor(DEFAULT_VOICE, u.text);
      const url = urlByHash.get(hash);
      if (!url) continue;
      entries.push({
        kind: "sentence",
        key: u.key,
        hash,
        text: u.text,
        audioUrl: url,
        cacheHit: true,
      });
      reused += 1;
    } else {
      const lines: LessonAudioLine[] = [];
      for (const line of u.lines) {
        const hash = hashFor(line.voice, line.text);
        const url = urlByHash.get(hash);
        if (!url) {
          lines.length = 0;
          break;
        }
        lines.push({
          speaker: line.speaker,
          text: line.text,
          voice: line.voice,
          hash,
          audioUrl: url,
          cacheHit: true,
        });
        reused += 1;
      }
      if (lines.length > 0) {
        entries.push({ kind: "conversation", key: u.key, lines });
      }
    }
  }

  return { entries, generated: 0, reused };
};

// ── Generation (instructor save) ────────────────────────────────────────────

/**
 * Insert one telemetry row per save into ai_generations. Used by the monthly
 * usage panel + cost bar. Never throws — telemetry failure must not break the
 * user-facing save.
 */
const logLessonTtsTelemetry = async (
  supabase: SupabaseClient<Database>,
  args: {
    userId: string;
    lessonId: string;
    generatedChars: number;
    generatedCount: number;
    reusedCount: number;
    totalEntries: number;
    latencyMs: number;
    error: string | null;
  },
): Promise<void> => {
  const costCents = Math.round(args.generatedChars * TTS_COST_CENTS_PER_CHAR);
  try {
    const { error } = await supabase.from("ai_generations").insert({
      user_id: args.userId,
      feature: "lesson_tts",
      model: TTS_MODEL,
      provider: "openai",
      prompt_version: "lesson_tts_v1",
      input_context: {
        lessonId: args.lessonId,
        generated: args.generatedCount,
        reused: args.reusedCount,
        totalEntries: args.totalEntries,
        generatedChars: args.generatedChars,
      },
      input_hash: createHash("sha256")
        .update(`lesson_tts|${args.lessonId}|${Date.now()}`)
        .digest("hex"),
      output: { generated: args.generatedCount, reused: args.reusedCount },
      schema_valid: true,
      retry_count: 0,
      input_tokens: null,
      output_tokens: null,
      cache_read_tokens: null,
      latency_ms: args.latencyMs,
      cost_cents: costCents,
      output_quiz_id: null,
      error: args.error,
    });
    if (error) {
      console.error("[ai.lesson-tts] telemetry insert failed:", error.message);
    }
  } catch (err) {
    console.error("[ai.lesson-tts] telemetry unexpected error:", err);
  }
};

export const synthesizeLessonAudio = async (
  supabase: SupabaseClient<Database>,
  lessonId: string,
  userId: string,
): Promise<SynthesizeLessonAudioResult> => {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, content")
    .eq("id", lessonId)
    .single();
  if (error || !lesson) throw new Error("Lesson not found");

  let content = lesson.content ?? "";
  const wrapResult = wrapOrphanConversations(content);
  if (wrapResult.wrapped > 0) {
    content = wrapResult.html;
    const { error: updateError } = await supabase
      .from("lessons")
      .update({ content })
      .eq("id", lessonId);
    if (updateError) {
      console.error(
        `[ai.lesson-tts] failed to persist wrapped conversations | lesson=${lessonId} | error:`,
        updateError.message,
      );
    } else {
      console.log(
        `[ai.lesson-tts] wrapped ${wrapResult.wrapped} orphan conversation(s) | lesson=${lessonId}`,
      );
    }
  }

  const units = extractLessonUnits(content);
  if (units.length === 0) return { entries: [], generated: 0, reused: 0 };

  const startedAt = Date.now();

  // ── 1. Batch cache lookup — one query instead of N round-trips. ─────
  const allHashes = collectHashes(units);
  const { data: cachedRows } = await supabase
    .from("ai_audio_cache")
    .select("script_hash, audio_url")
    .in("script_hash", allHashes)
    .eq("speed", SPEED);

  const cacheUrlByHash = new Map<string, string>();
  for (const row of cachedRows ?? []) {
    cacheUrlByHash.set(row.script_hash, row.audio_url);
  }

  const entries: LessonAudioEntry[] = [];
  let generated = 0;
  let reused = 0;
  let generatedChars = 0;
  let firstError: string | null = null;

  for (const u of units) {
    if (u.kind === "sentence") {
      const hash = hashFor(DEFAULT_VOICE, u.text);
      const cached = cacheUrlByHash.get(hash);
      if (cached) {
        entries.push({
          kind: "sentence",
          key: u.key,
          hash,
          text: u.text,
          audioUrl: cached,
          cacheHit: true,
        });
        reused += 1;
        continue;
      }
      try {
        const res = await synthesizeSpeech({
          supabase,
          script: u.text,
          voiceId: DEFAULT_VOICE,
          speed: SPEED,
        });
        entries.push({
          kind: "sentence",
          key: u.key,
          hash,
          text: u.text,
          audioUrl: res.audioUrl,
          cacheHit: res.cacheHit,
        });
        if (res.cacheHit) reused += 1;
        else {
          generated += 1;
          generatedChars += u.text.length;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!firstError) firstError = msg;
        console.error(
          `[ai.lesson-tts] sentence failed | text="${u.text.slice(0, 40)}…" | error:`,
          msg,
        );
      }
      continue;
    }

    // Conversation — synthesize each line in its own voice.
    const lines: LessonAudioLine[] = [];
    let convFailed = false;
    for (const line of u.lines) {
      const hash = hashFor(line.voice, line.text);
      const cached = cacheUrlByHash.get(hash);
      if (cached) {
        lines.push({
          speaker: line.speaker,
          text: line.text,
          voice: line.voice,
          hash,
          audioUrl: cached,
          cacheHit: true,
        });
        reused += 1;
        continue;
      }
      try {
        const res = await synthesizeSpeech({
          supabase,
          script: line.text,
          voiceId: line.voice,
          speed: SPEED,
        });
        lines.push({
          speaker: line.speaker,
          text: line.text,
          voice: line.voice,
          hash,
          audioUrl: res.audioUrl,
          cacheHit: res.cacheHit,
        });
        if (res.cacheHit) reused += 1;
        else {
          generated += 1;
          generatedChars += line.text.length;
        }
      } catch (err) {
        convFailed = true;
        const msg = err instanceof Error ? err.message : String(err);
        if (!firstError) firstError = msg;
        console.error(
          `[ai.lesson-tts] conv line failed | conv=${u.key} | voice=${line.voice} | text="${line.text.slice(0, 40)}…" | error:`,
          msg,
        );
        break;
      }
    }
    if (!convFailed && lines.length > 0) {
      entries.push({ kind: "conversation", key: u.key, lines });
    }
  }

  const latencyMs = Date.now() - startedAt;
  console.log(
    `[ai.lesson-tts] lesson=${lessonId} | entries=${entries.length} | generated=${generated} | reused=${reused} | chars=${generatedChars} | latency=${latencyMs}ms`,
  );

  await logLessonTtsTelemetry(supabase, {
    userId,
    lessonId,
    generatedChars,
    generatedCount: generated,
    reusedCount: reused,
    totalEntries: entries.length,
    latencyMs,
    error: firstError,
  });

  return { entries, generated, reused };
};
