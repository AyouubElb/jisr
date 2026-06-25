import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { AdminStats } from "@/lib/api/admin.api";

type InviteRow = Database["public"]["Tables"]["invites"]["Row"];
type RecentInvite = Pick<
  InviteRow,
  "id" | "email" | "full_name" | "consumed_at" | "expires_at" | "created_at"
>;

/** Server twin of adminApi.stats — platform-wide counts, scoped by admin RLS. */
export async function statsServer(
  supabase: SupabaseClient<Database>,
): Promise<AdminStats> {
  const [instructors, students, courses, enrollments] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "instructor"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase.from("enrollments").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalInstructors: instructors.count ?? 0,
    totalStudents: students.count ?? 0,
    totalCourses: courses.count ?? 0,
    totalEnrollments: enrollments.count ?? 0,
  };
}

/** Server twin of adminApi.recentInvites — last 5 invites. */
export async function recentInvitesServer(
  supabase: SupabaseClient<Database>,
): Promise<RecentInvite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("id, email, full_name, consumed_at, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}
