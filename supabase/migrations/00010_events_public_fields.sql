-- =============================================================================
-- Customer-facing public events
--
-- Adds columns that turn an internal event row into a publicly listable
-- ticketed event, plus an RLS policy that lets anonymous visitors read
-- public events. The existing private RLS policies are unchanged; this is
-- purely additive.
-- =============================================================================

ALTER TABLE events
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN public_slug text UNIQUE,
  ADD COLUMN public_summary text,
  ADD COLUMN hero_image_url text,
  ADD COLUMN ticketing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN ticket_price_cents integer,
  ADD COLUMN ticket_capacity integer,
  ADD COLUMN address_reveal_at timestamptz,
  ADD COLUMN public_address text;

CREATE INDEX idx_events_public ON events(is_public) WHERE is_public = true;
CREATE INDEX idx_events_public_slug ON events(public_slug) WHERE public_slug IS NOT NULL;

-- Anonymous and authenticated users can read events marked public.
-- Note that anon may read all columns; queries in the customer-facing app
-- MUST use explicit column lists and never select notes/public_address/etc.
-- (public_address is only revealed via the address-reveal flow, which runs
-- server-side under the service-role client).
CREATE POLICY events_public_read ON events
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND status IN ('active', 'finalized'));
