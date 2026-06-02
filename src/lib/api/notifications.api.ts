import { createClient } from "@/lib/supabase/client";
import type { NotificationType } from "@/lib/services/notifications/types";

export interface Notification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  // Current user's notifications, newest first (RLS scopes to own rows).
  list: async (limit = 20): Promise<Notification[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  unreadCount: async (): Promise<number> => {
    const supabase = createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  },

  markRead: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  markAllRead: async (): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) throw error;
  },
};
