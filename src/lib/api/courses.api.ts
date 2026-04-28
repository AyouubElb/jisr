import { createClient } from "@/lib/supabase/client";
import type {
  CEFRLevel,
  CourseInsert,
  CourseUpdate,
  CourseWithDetails,
  CourseWithInstructor,
  Lesson,
  QuizWithBlocks,
  Section,
  SectionTimelineItem,
  SectionWithContent,
} from "@/lib/types";

type RawSectionRow = Section & {
  lessons: Lesson[];
  quizzes: QuizWithBlocks[];
  section_items: Array<{
    id: string;
    item_type: "lesson" | "quiz";
    item_id: string;
    position: number;
  }>;
};

function attachItems(row: RawSectionRow): SectionWithContent {
  const lessonById = new Map(row.lessons.map((l) => [l.id, l]));
  const quizById = new Map(row.quizzes.map((q) => [q.id, q]));
  const sorted = [...row.section_items].sort((a, b) => a.position - b.position);
  const items: SectionTimelineItem[] = [];
  for (const si of sorted) {
    if (si.item_type === "lesson") {
      const data = lessonById.get(si.item_id);
      if (data) items.push({ id: si.id, item_type: "lesson", position: si.position, data });
    } else {
      const data = quizById.get(si.item_id);
      if (data) items.push({ id: si.id, item_type: "quiz", position: si.position, data });
    }
  }
  return { ...row, items };
}

export const coursesApi = {
  /** List published courses (optionally filtered by level) */
  list: async (level?: CEFRLevel): Promise<CourseWithInstructor[]> => {
    const supabase = createClient();
    let query = supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (level) {
      query = query.eq("level", level);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as CourseWithInstructor[];
  },

  /** List all courses for the current instructor (published + drafts) */
  listMine: async (): Promise<CourseWithInstructor[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifie");

    const { data, error } = await supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url)")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as CourseWithInstructor[];
  },

  /** Get a single course with sections (each containing lessons, quizzes,
   *  and the shared `items[]` timeline) plus live sessions. */
  detail: async (id: string): Promise<CourseWithDetails> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .select(
        "*, profiles(full_name, avatar_url), sections(*, lessons(*), quizzes(*, quiz_blocks(*)), section_items(id, item_type, item_id, position)), live_sessions(*)",
      )
      .eq("id", id)
      .order("order", { referencedTable: "sections", ascending: true })
      .order("order", { referencedTable: "sections.quizzes.quiz_blocks", ascending: true })
      .order("scheduled_at", { referencedTable: "live_sessions", ascending: true })
      .single();

    if (error) throw error;

    const raw = data as unknown as Omit<CourseWithDetails, "sections"> & {
      sections: RawSectionRow[];
    };
    return { ...raw, sections: raw.sections.map(attachItems) };
  },

  /** Create a new course */
  create: async (course: CourseInsert): Promise<{ id: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .insert(course)
      .select("id")
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a course */
  update: async (id: string, updates: CourseUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a course */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) throw error;
  },
};
