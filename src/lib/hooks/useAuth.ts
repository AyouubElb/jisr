"use client";

import { useQuery } from "@tanstack/react-query";
import { profileKeys } from "@/lib/constants/queryKeys";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/** Fetch current user's profile (role, name, etc.) */
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: async (): Promise<Profile | null> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // profile rarely changes
  });
}
