import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";

export default async function InstructorLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "instructor") {
    redirect("/student");
  }

  return (
    <AppShell role="instructor" fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
