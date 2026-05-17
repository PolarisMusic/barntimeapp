-- =============================================================================
-- Public storage bucket for event hero images.
--
-- Hero images surface on the public event listing and detail page, so the
-- bucket is public-read. Only staff/platform_admin can upload/replace/delete.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-hero-images', 'event-hero-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read (the bucket is also marked public, but explicit policy
-- documents intent and survives CDN config changes).
CREATE POLICY "Hero images are publicly readable"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'event-hero-images');

CREATE POLICY "Staff can upload hero images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-hero-images' AND is_staff());

CREATE POLICY "Staff can update hero images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-hero-images' AND is_staff());

CREATE POLICY "Staff can delete hero images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-hero-images' AND is_staff());
