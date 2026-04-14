import { createClient } from "@/lib/supabase/client";
import type { LiveSession, LiveSessionInsert, LiveSessionUpdate } from "@/lib/types";

export const sessionsApi = {
  /** List sessions for a course */
  listByCourse: async (courseId: string): Promise<LiveSession[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("course_id", courseId)
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  /** List upcoming sessions for the current user (across all enrolled courses) */
  listUpcoming: async (): Promise<(LiveSession & { courses: { title: string } })[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*, courses(title)")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return data as unknown as (LiveSession & { courses: { title: string } })[];
  },

  /** Create a new session */
  create: async (session: LiveSessionInsert): Promise<LiveSession> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("live_sessions")
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a session */
  update: async (id: string, updates: LiveSessionUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("live_sessions")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a session */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (error) throw error;
  },
};
