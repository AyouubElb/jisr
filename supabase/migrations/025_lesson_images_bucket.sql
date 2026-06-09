-- lesson-images public storage bucket.
-- Lesson HTML embeds many images at once; signed URLs would force a round-trip
-- per image on every render, so the bucket is public.

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-images', 'lesson-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lesson_images_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lesson-images');

CREATE POLICY "lesson_images_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'lesson-images');

CREATE POLICY "lesson_images_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lesson-images');
