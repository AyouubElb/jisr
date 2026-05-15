import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type ProfileTier = "free" | "pro" | "studio";

export const profilesApi = {
  getTier: async (
    supabase: SupabaseClient<Database>,
    userId: string,
  ): Promise<ProfileTier | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data.tier;
  },
};
