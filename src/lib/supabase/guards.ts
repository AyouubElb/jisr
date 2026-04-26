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
  if (profile.role === "admin") redirect("/admin");

  return profile;
}

/**
 * Server-side guard: require a logged-in instructor. Redirects students to
 * their dashboard, admins to admin home, and unauthenticated users to /login.
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

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");
  if (profile.role !== "instructor") redirect("/student");

  return profile;
}

/**
 * Server-side guard: require a logged-in admin. Non-admins are redirected
 * to their regular dashboard; unauthenticated users go to /login.
 */
export async function requireAdmin(): Promise<Profile> {
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
  if (profile.role !== "admin") {
    redirect(profile.role === "instructor" ? "/instructor" : "/student");
  }

  return profile;
}
