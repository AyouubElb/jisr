import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  gradeAttempt,
  AttemptNotFoundError,
  AttemptForbiddenError,
  AttemptNotSubmittedError,
  GradingFailedError,
} from "@/lib/services/ai/student-grade.service";
import {
  AICostBudgetExceededError,
  AIQuotaExceededError,
} from "@/lib/ai/types";
import { aiLimiter, enforceRateLimit } from "@/lib/services/rate-limit.service";

// Literal required by Next segment config; keep AI routes in sync.
export const maxDuration = 60;

const Body = z.object({
  attemptId: z.uuid(),
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

  const limited = await enforceRateLimit(aiLimiter, user.id);
  if (limited) return limited;

  try {
    const result = await gradeAttempt(supabase, user.id, body.attemptId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AttemptNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AttemptForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof AttemptNotSubmittedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (
      err instanceof AIQuotaExceededError ||
      err instanceof AICostBudgetExceededError
    ) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof GradingFailedError) {
      return NextResponse.json(
        { error: err.message, rawText: err.rawText ?? null },
        { status: 502 },
      );
    }
    throw err;
  }
}
