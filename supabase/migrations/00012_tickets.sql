-- =============================================================================
-- Tickets: blockchain-ready issuance ledger
--
-- The DB is the source of truth pre-mint. One row per seat (no quantity>1).
-- Serials are dense per event, allocated under FOR UPDATE so a sold-out race
-- cannot leave gaps. issuance_hash is the immutable artifact set at paid time;
-- the on-chain layer (a future minter service) records token id and tx hash
-- into the same row when minting completes.
-- =============================================================================

CREATE TYPE ticket_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');
CREATE TYPE ticket_kind   AS ENUM ('attendee', 'performer', 'staff', 'crew');

ALTER TABLE profiles
  ADD COLUMN wallet_address text;

-- Lightweight check: matches a 0x-prefixed 20-byte hex address. We store the
-- checksummed form (case preserved) but accept any case in the check.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_wallet_address_format
  CHECK (wallet_address IS NULL OR wallet_address ~ '^0x[0-9a-fA-F]{40}$');

CREATE TABLE tickets (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                    uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  profile_id                  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  kind                        ticket_kind NOT NULL DEFAULT 'attendee',
  serial_number               integer NOT NULL,
  quantity                    integer NOT NULL DEFAULT 1 CHECK (quantity = 1),
  unit_price_cents            integer NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  status                      ticket_status NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id  text UNIQUE,
  stripe_payment_intent_id    text UNIQUE,
  paid_at                     timestamptz,
  issuance_hash               text,
  metadata_json               jsonb,
  chain_id                    integer,
  contract_address            text,
  token_id                    numeric,
  mint_tx_hash                text,
  minted_at                   timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, serial_number)
);

CREATE INDEX idx_tickets_profile ON tickets(profile_id);
CREATE INDEX idx_tickets_event   ON tickets(event_id);
CREATE INDEX idx_tickets_status  ON tickets(status);
CREATE INDEX idx_tickets_pending_old
  ON tickets(created_at)
  WHERE status = 'pending';

CREATE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users see their own tickets. Writes go through SECURITY DEFINER functions
-- and the service role; no direct INSERT/UPDATE/DELETE policy is granted.
CREATE POLICY tickets_owner_read ON tickets
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY tickets_staff_all ON tickets
  FOR ALL
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- ---------------------------------------------------------------------------
-- Public certificate view: anyone can verify "I held ticket 7 of 50" forever,
-- without leaking buyer identity. Only exposes non-PII columns.
-- ---------------------------------------------------------------------------
CREATE VIEW public_ticket_certificates
WITH (security_invoker = true) AS
SELECT
  t.id              AS ticket_id,
  e.public_slug     AS event_slug,
  e.name            AS event_name,
  t.serial_number,
  t.kind,
  t.issuance_hash,
  t.minted_at,
  t.token_id,
  t.contract_address,
  t.chain_id
FROM tickets t
JOIN events e ON e.id = t.event_id
WHERE t.status = 'paid'
  AND e.is_public = true
  AND e.public_slug IS NOT NULL;

GRANT SELECT ON public_ticket_certificates TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- event_paid_ticket_count: how many seats have been sold (status='paid').
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION event_paid_ticket_count(p_event_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(count(*)::int, 0)
  FROM public.tickets
  WHERE event_id = p_event_id AND status = 'paid';
$$;

GRANT EXECUTE ON FUNCTION event_paid_ticket_count(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- cleanup_expired_pending_tickets: release pending rows that never paid.
-- v1 is lazy — issue_ticket() calls this for the event before allocating.
-- A cron can pick it up later if we ever need it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_pending_tickets(
  p_event_id uuid,
  p_ttl_minutes integer DEFAULT 20
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH released AS (
    UPDATE public.tickets
       SET status = 'cancelled', updated_at = now()
     WHERE event_id = p_event_id
       AND status = 'pending'
       AND created_at < now() - make_interval(mins => p_ttl_minutes)
     RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM released;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- issue_ticket: allocate a pending ticket with the next dense serial number.
--
-- Locks the events row FOR UPDATE so concurrent buys serialize and serials
-- stay gap-free relative to non-cancelled rows. Released (cancelled) serials
-- ARE reused if their slot is the next one to allocate; serial_number is the
-- max(non-cancelled) + 1, which keeps the "X of Y" semantics intact.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION issue_ticket(
  p_event_id uuid,
  p_profile_id uuid,
  p_kind ticket_kind DEFAULT 'attendee'
)
RETURNS tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_event       public.events%ROWTYPE;
  v_active_count integer;
  v_next_serial  integer;
  v_unit_price   integer;
  v_ticket       public.tickets%ROWTYPE;
BEGIN
  -- Lock the event row to serialize seat allocation.
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  -- Sweep expired pending rows for this event before allocating.
  PERFORM public.cleanup_expired_pending_tickets(p_event_id);

  -- Free attendee tickets respect ticketing_enabled + capacity. Performer/
  -- staff/crew issuance bypasses both (organizer comp seats).
  IF p_kind = 'attendee' THEN
    IF NOT COALESCE(v_event.ticketing_enabled, false) THEN
      RAISE EXCEPTION 'Ticketing is not enabled for this event';
    END IF;

    SELECT count(*)::int INTO v_active_count
      FROM public.tickets
     WHERE event_id = p_event_id
       AND kind = 'attendee'
       AND status IN ('pending', 'paid');

    IF v_event.ticket_capacity IS NOT NULL
       AND v_active_count >= v_event.ticket_capacity THEN
      RAISE EXCEPTION 'Sold out' USING ERRCODE = 'P0001';
    END IF;

    v_unit_price := COALESCE(v_event.ticket_price_cents, 0);
  ELSE
    v_unit_price := 0;
  END IF;

  -- Dense next-serial across all non-cancelled rows for this event.
  SELECT COALESCE(MAX(serial_number), 0) + 1
    INTO v_next_serial
    FROM public.tickets
   WHERE event_id = p_event_id
     AND status IN ('pending', 'paid', 'refunded');

  INSERT INTO public.tickets (
    event_id, profile_id, kind, serial_number, unit_price_cents, status
  ) VALUES (
    p_event_id, p_profile_id, p_kind, v_next_serial, v_unit_price,
    CASE WHEN p_kind = 'attendee' THEN 'pending'::public.ticket_status
         ELSE 'paid'::public.ticket_status END
  )
  RETURNING * INTO v_ticket;

  -- Comp tickets are paid the moment they're issued; finalize their hash.
  IF p_kind <> 'attendee' THEN
    UPDATE public.tickets
       SET paid_at = now(),
           issuance_hash = encode(
             public.digest(
               v_ticket.event_id::text
               || '|' || v_ticket.serial_number::text
               || '|' || v_ticket.profile_id::text
               || '|' || v_ticket.kind::text
               || '|' || extract(epoch FROM now())::text,
               'sha256'
             ),
             'hex'
           )
     WHERE id = v_ticket.id
    RETURNING * INTO v_ticket;
  END IF;

  RETURN v_ticket;
END;
$$;

-- pgcrypto provides digest(). Available by default in Supabase but ensure it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- finalize_ticket: idempotent flip of pending → paid driven by the webhook.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION finalize_ticket(
  p_ticket_id uuid,
  p_payment_intent text
)
RETURNS tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_ticket   public.tickets%ROWTYPE;
  v_event    public.events%ROWTYPE;
  v_hash     text;
  v_metadata jsonb;
BEGIN
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent: if already paid, just return.
  IF v_ticket.status = 'paid' THEN
    RETURN v_ticket;
  END IF;

  IF v_ticket.status <> 'pending' THEN
    RAISE EXCEPTION 'Ticket is not pending (status=%)', v_ticket.status;
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_ticket.event_id;

  v_hash := encode(
    public.digest(
      v_ticket.event_id::text
      || '|' || v_ticket.serial_number::text
      || '|' || v_ticket.profile_id::text
      || '|' || v_ticket.kind::text
      || '|' || extract(epoch FROM now())::text,
      'sha256'
    ),
    'hex'
  );

  v_metadata := jsonb_build_object(
    'name',         format('Barntime — %s #%s', v_event.name, v_ticket.serial_number),
    'description',  COALESCE(v_event.public_summary, v_event.description, ''),
    'image',        COALESCE(v_event.hero_image_url, ''),
    'external_url', format('/events/%s', COALESCE(v_event.public_slug, v_event.id::text)),
    'attributes',   jsonb_build_array(
      jsonb_build_object('trait_type', 'Event',  'value', v_event.name),
      jsonb_build_object('trait_type', 'Date',   'value', COALESCE(v_event.start_date::text, '')),
      jsonb_build_object('trait_type', 'Serial', 'value', v_ticket.serial_number::text),
      jsonb_build_object('trait_type', 'Kind',   'value', v_ticket.kind::text)
    )
  );

  UPDATE public.tickets
     SET status = 'paid',
         paid_at = now(),
         stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, p_payment_intent),
         issuance_hash = v_hash,
         metadata_json = v_metadata
   WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

-- The webhook + buy action use createServiceClient() so RPCs run as service
-- role; no public GRANT necessary on issue_ticket/finalize_ticket.
