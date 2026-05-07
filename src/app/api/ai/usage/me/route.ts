import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getMonthlyUsage } from "@/lib/ai/quotas";

export async function GET(): Promise<Response> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const summary = await getMonthlyUsage(supabase, user.id);
  return NextResponse.json(summary);
}
