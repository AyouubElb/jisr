import { createClient } from "@/lib/supabase/client";

// Upload an image to the public `lesson-images` bucket and return the
// permanent public URL. The URL is embedded directly into lesson HTML —
// public bucket = zero round-trip to mint a signed URL on every render.
// See docs/AI-AGENTS.md "Lesson images" for the storage rationale.

const BUCKET = "lesson-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export class LessonImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonImageUploadError";
  }
}

export const lessonImagesApi = {
  /** Upload a single image. Returns its public URL. */
  upload: async (file: File): Promise<string> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new LessonImageUploadError(
        `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, or GIF.`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new LessonImageUploadError(
        `Image is too large (${Math.round(file.size / 1024)} KB). Max is 5 MB.`,
      );
    }

    const supabase = createClient();
    // Random path prefix + the original extension. Random keeps the bucket
    // tidy (no collisions) and the public URL unguessable enough for our
    // educational-content threat model.
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "img";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new LessonImageUploadError(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return publicUrl;
  },
};
