import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  fetchLessonAudio,
  synthesizeLessonAudio,
} from "@/lib/services/ai/lesson-tts.service";
import { aiLimiter, enforceRateLimit } from "@/lib/services/rate-limit.service";

// Literal required by Next segment config; keep AI routes in sync.
export const maxDuration = 60;

const Body = z.object({
  lessonId: z.uuid(),
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
    const result = await synthesizeLessonAudio(supabase, body.lessonId, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request): Promise<Response> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  try {
    const result = await fetchLessonAudio(supabase, lessonId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audio fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
