import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notifications/notify.service";
import { z } from "zod";

const bodySchema = z.object({
  student_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  quiz_id: z.string().uuid(),
  quiz_title: z.string(),
  course_id: z.string().uuid(),
  score: z.number().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Only an authenticated instructor can trigger a "quiz corrected" notice.
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "instructor") {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }

  const { student_id, attempt_id, quiz_id, quiz_title, course_id, score } = parsed.data;
  await createNotification({
    userId: student_id,
    type: "quiz_corrected",
    payload: { attempt_id, quiz_id, quiz_title, course_id, score },
  });

  return NextResponse.json({ ok: true });
}
