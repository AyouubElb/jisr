import { createClient } from "@/lib/supabase/client";
import type {
  Lesson,
  QuizWithBlocks,
  Section,
  SectionInsert,
  SectionTimelineItem,
  SectionUpdate,
  SectionWithContent,
} from "@/lib/types";

// Raw section row as returned by the supabase query below — has section_items
// joined in but lessons/quizzes still as flat arrays. We assemble `items[]`
// in JS by joining the section_items rows with the lesson/quiz data.
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

/**
 * Build the `items[]` timeline from section_items + lesson/quiz lookups.
 * Sorted ascending by position. Items whose underlying row is missing (e.g.
 * an orphan section_items row that hasn't been cleaned up yet) are skipped.
 */
function buildTimeline(row: RawSectionRow): SectionTimelineItem[] {
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
  return items;
}

export const sectionsApi = {
  /** List sections for a course with their lessons, quizzes, and shared timeline. */
  listByCourse: async (courseId: string): Promise<SectionWithContent[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sections")
      .select(
        "*, lessons(*), quizzes(*, quiz_blocks(*)), section_items(id, item_type, item_id, position)",
      )
      .eq("course_id", courseId)
      .order("order", { ascending: true })
      .order("order", { referencedTable: "quizzes.quiz_blocks", ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as unknown as RawSectionRow[];
    return rows.map((row) => ({
      ...row,
      items: buildTimeline(row),
    }));
  },

  /** Create a new section */
  create: async (section: SectionInsert): Promise<Section> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sections")
      .insert(section)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update a section */
  update: async (id: string, updates: SectionUpdate): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("sections")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  /** Delete a section (cascades to lessons + quizzes + section_items) */
  delete: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) throw error;
  },

  /** Move a lesson or quiz to a new position in its section. */
  reorderItem: async (
    sectionItemId: string,
    newPosition: number,
  ): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.rpc("reorder_section_item", {
      p_section_item_id: sectionItemId,
      p_new_position: newPosition,
    });
    if (error) throw error;
  },
};
