import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  generateQuizForSection,
  QuizGenerationFailedError,
  QuizGenValidationError,
  QuizPersistError,
  QuizTTSError,
  SectionForbiddenError,
  SectionNotFoundError,
} from "@/lib/services/ai/quiz-gen.service";
import {
  AICostBudgetExceededError,
  AIQuotaExceededError,
} from "@/lib/ai/types";
import { AITimeoutError } from "@/lib/ai/timeout";
import {
  QUIZ_GEN_MAX_LESSONS,
  QUIZ_GEN_MAX_DIRECT_QUESTIONS,
  QUIZ_GEN_MAX_PASSAGES_PER_TYPE,
} from "@/lib/ai/constants";
import { aiLimiter, enforceRateLimit } from "@/lib/services/rate-limit.service";

// Literal required by Next segment config; keep AI routes in sync.
export const maxDuration = 60;

const BodySchema = z.object({
  sectionId: z.uuid(),
  lessonIds: z.array(z.uuid()).min(1).max(QUIZ_GEN_MAX_LESSONS),
  numQuestions: z.number().int().min(0).max(QUIZ_GEN_MAX_DIRECT_QUESTIONS),
  mix: z.object({
    mcq: z.number().int().min(0),
    fill_blank: z.number().int().min(0),
    free_text: z.number().int().min(0),
    voice_response: z.number().int().min(0),
    audio_passage: z.number().int().min(0).max(QUIZ_GEN_MAX_PASSAGES_PER_TYPE),
    text_passage: z.number().int().min(0).max(QUIZ_GEN_MAX_PASSAGES_PER_TYPE),
  }),
  questionsPerTextPassage: z.object({
    mcq: z.number().int().min(0).max(5),
    fill_blank: z.number().int().min(0).max(5),
  }),
  questionsPerAudioPassage: z.object({
    mcq: z.number().int().min(0).max(5),
    fill_blank: z.number().int().min(0).max(5),
  }),
  focusTopic: z.string().max(500).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const limited = await enforceRateLimit(aiLimiter, user.id);
  if (limited) return limited;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message : "Requête invalide";
    return NextResponse.json(
      { error: message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  try {
    const result = await generateQuizForSection(supabase, user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof QuizGenValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof SectionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof SectionForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (
      err instanceof AIQuotaExceededError ||
      err instanceof AICostBudgetExceededError
    ) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof AITimeoutError) {
      return NextResponse.json(
        {
          error:
            "The AI took too long to respond. Try again, or generate a smaller quiz (fewer questions or one passage at a time).",
        },
        { status: 408 },
      );
    }
    if (err instanceof QuizGenerationFailedError) {
      return NextResponse.json(
        { error: err.message, rawText: err.rawText ?? null },
        { status: err.kind === "timeout" ? 504 : 502 },
      );
    }
    if (err instanceof QuizTTSError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    if (err instanceof QuizPersistError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }
}
