import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { proposeLessonGen } from "@/lib/services/ai/lesson-gen.service";
import {
  LessonForbiddenError,
  LessonNotFoundError,
} from "@/lib/services/ai/lesson-edit.service";
import {
  AICostBudgetExceededError,
  AIGenerationError,
  AIQuotaExceededError,
} from "@/lib/ai/types";

const Body = z.object({
  lessonId: z.uuid(),
  scope: z.string().min(3).max(500),
  depth: z.enum(["quick", "detailed"]),
  includeExercises: z.boolean(),
  includeFrenchSupport: z.boolean(),
  theme: z.string().max(200).optional(),
  extraNotes: z.string().max(1000).optional(),
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

  try {
    const result = await proposeLessonGen(supabase, user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LessonNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof LessonForbiddenError) {
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
    throw err;
  }
}
