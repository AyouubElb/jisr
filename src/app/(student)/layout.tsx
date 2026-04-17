import { requireStudent } from "@/lib/supabase/guards";
import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const profile = await requireStudent();

  return (
    <AppShell role="student" fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
