import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  applyQuizEdit,
  proposeQuizEdit,
  QuizApplyError,
  QuizForbiddenError,
  QuizNotFoundError,
} from "@/lib/services/ai/quiz-edit.service";
import {
  AICostBudgetExceededError,
  AIGenerationError,
  AIQuotaExceededError,
} from "@/lib/ai/types";
import { aiQuizChangeWireSchema } from "@/lib/ai/schemas/quiz-edit.schema";

// ── Body schemas ───────────────────────────────────────────────────────
const ProposeBody = z.object({
  action: z.literal("propose"),
  quizId: z.uuid(),
  instruction: z.string().min(3).max(1000),
  chatHistory: z.string().max(4000).optional(),
});

const ApplyBody = z.object({
  action: z.literal("apply"),
  quizId: z.uuid(),
  generationId: z.uuid(),
  // Already filtered client-side to the changes the instructor accepted.
  // Wire schema uses a discriminated union (no LLM involved here).
  changes: z.array(aiQuizChangeWireSchema).min(1),
});

const Body = z.discriminatedUnion("action", [ProposeBody, ApplyBody]);

export async function POST(req: Request): Promise<Response> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message : "Requête invalide";
    return NextResponse.json(
      { error: message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  try {
    if (body.action === "propose") {
      const result = await proposeQuizEdit(supabase, user.id, {
        quizId: body.quizId,
        instruction: body.instruction,
        chatHistory: body.chatHistory,
      });
      return NextResponse.json(result);
    }
    const result = await applyQuizEdit(supabase, user.id, {
      quizId: body.quizId,
      generationId: body.generationId,
      changes: body.changes,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof QuizNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof QuizForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (
      err instanceof AIQuotaExceededError ||
      err instanceof AICostBudgetExceededError
    ) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof AIGenerationError) {
      return NextResponse.json(
        { error: err.message, rawText: err.rawText ?? null },
        { status: 502 },
      );
    }
    if (err instanceof QuizApplyError) {
      return NextResponse.json(
        { error: err.message, applied: err.applied, total: err.total },
        { status: err.cause === "tts" ? 502 : 500 },
      );
    }
    throw err;
  }
}
