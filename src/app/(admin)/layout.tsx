import { requireAdmin } from "@/lib/supabase/guards";
import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const profile = await requireAdmin();

  return (
    <AppShell role="admin" fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
