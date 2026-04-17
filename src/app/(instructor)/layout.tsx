import { requireInstructor } from "@/lib/supabase/guards";
import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";

export default async function InstructorLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const profile = await requireInstructor();

  return (
    <AppShell role="instructor" fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
