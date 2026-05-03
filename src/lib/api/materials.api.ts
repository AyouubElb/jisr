import { createClient } from "@/lib/supabase/client";
import type { Material, MaterialInsert } from "@/lib/types";

const BUCKET = "materials";

export const materialsApi = {
  /** List materials for a lesson */
  listByLesson: async (lessonId: string): Promise<Material[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  /** Upload a file and create a material row */
  upload: async (
    file: File,
    params: { courseId: string; lessonId: string },
  ): Promise<Material> => {
    const supabase = createClient();
    const path = `${params.courseId}/${params.lessonId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;

    const insert: MaterialInsert = {
      name: file.name,
      file_url: path,
      file_type: file.type,
      lesson_id: params.lessonId,
    };

    const { data, error } = await supabase
      .from("materials")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Get a signed download URL — passthrough if already a full http(s) URL
   * (e.g. TTS audio in the public quiz-audio bucket). */
  getSignedUrl: async (path: string): Promise<string> => {
    if (/^https?:\/\//i.test(path)) return path;

    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) throw error;
    return data.signedUrl;
  },

  /** Upload a quiz media file (audio/image) — no DB row, path stored in block JSONB */
  uploadQuizMedia: async (
    file: File,
    params: { courseId: string; quizId: string },
  ): Promise<string> => {
    const supabase = createClient();
    const path = `${params.courseId}/quizzes/${params.quizId}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (error) throw error;

    return path;
  },

  /** Upload a student's voice answer for a quiz block — path stored in student_answers.answer */
  uploadQuizAnswer: async (
    file: File,
    params: {
      courseId: string;
      quizId: string;
      attemptId: string;
      blockId: string;
    },
  ): Promise<string> => {
    const supabase = createClient();
    const path = `${params.courseId}/quizzes/${params.quizId}/answers/${params.attemptId}/${params.blockId}_${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (error) throw error;

    return path;
  },

  /** Delete a material (storage file + DB row) */
  delete: async (id: string, fileUrl: string): Promise<void> => {
    const supabase = createClient();

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([fileUrl]);
    if (storageError) throw storageError;

    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) throw error;
  },
};
