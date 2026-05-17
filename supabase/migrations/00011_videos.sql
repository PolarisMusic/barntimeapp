-- =============================================================================
-- Videos
--
-- Admin-managed YouTube URLs surfaced as a TikTok-style public feed.
-- Source of truth is the URL; we do not upload or host video files.
-- =============================================================================

CREATE TABLE videos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  caption         text,
  youtube_url     text NOT NULL,
  event_id        uuid REFERENCES events(id) ON DELETE SET NULL,
  display_order   integer NOT NULL DEFAULT 0,
  is_published    boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_published ON videos(is_published, display_order, published_at DESC)
  WHERE is_published = true;
CREATE INDEX idx_videos_event ON videos(event_id) WHERE event_id IS NOT NULL;

CREATE TRIGGER set_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can see published videos.
CREATE POLICY videos_public_read ON videos
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Staff (platform_admin / staff) can do anything.
CREATE POLICY videos_staff_all ON videos
  FOR ALL
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
