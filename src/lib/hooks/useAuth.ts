"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileKeys } from "@/lib/constants/queryKeys";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch current auth user — has email, id, metadata */
export function useCurrentUser() {
  return useQuery({
    queryKey: [...profileKeys.all, "auth-user"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ full_name }: { full_name: string }): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifie");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      toast.success("Profil mis a jour");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ password }: { password: string }): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mot de passe mis a jour");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
