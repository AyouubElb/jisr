import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { LiveSession } from "@/lib/types";

export type UpcomingSession = LiveSession & { courses: { title: string } };

/** Server twin of sessionsApi.listUpcoming. Rows are scoped by RLS, same as the browser. */
export async function listUpcomingSessionsServer(
  supabase: SupabaseClient<Database>,
): Promise<UpcomingSession[]> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*, courses(title)")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data as unknown as UpcomingSession[];
}
