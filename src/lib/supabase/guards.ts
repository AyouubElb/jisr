import { redirect } from "next/navigation";
import { createServerSupabase } from "./server";
import type { Profile } from "@/lib/types";

/**
 * Server-side guard: require a logged-in student. Redirects instructors to
 * their dashboard and unauthenticated users to /login. Returns the profile so
 * layouts can pass `fullName` etc. to their shell.
 */
export async function requireStudent(): Promise<Profile> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "instructor") redirect("/instructor");

  return profile;
}

/**
 * Server-side guard: require a logged-in instructor. Redirects students to
 * their dashboard and unauthenticated users to /login.
 */
export async function requireInstructor(): Promise<Profile> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "instructor") redirect("/student");

  return profile;
}
