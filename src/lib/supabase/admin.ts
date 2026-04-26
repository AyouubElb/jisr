import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Admin (service-role) Supabase client. Bypasses RLS entirely.
 *
 * Import only from route handlers or server actions. The `server-only` import
 * at the top makes the build fail if a client component imports this file.
 *
 * The env var is NOT prefixed with NEXT_PUBLIC_, so it never ships to the
 * browser. See docs/AUTH.md for the full safety model.
 */
export function createAdminSupabase(): ReturnType<typeof createClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
