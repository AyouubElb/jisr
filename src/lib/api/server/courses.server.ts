import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { CourseWithInstructor } from "@/lib/types";

/** Server twin of coursesApi.listMine — caller supplies the server client + instructor id. */
export async function listMyCoursesServer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CourseWithInstructor[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, profiles(full_name, avatar_url)")
    .eq("instructor_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as CourseWithInstructor[];
}
