-- =============================================================================
-- Migration 8: Curated participant directory + structured activity details
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. account_linkable_accounts: curated allowlist of accounts that can appear
--    in the portal participant picker for a given owner account
-- ---------------------------------------------------------------------------

CREATE TABLE account_linkable_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  linkable_account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_account_id, linkable_account_id),
  CHECK (owner_account_id != linkable_account_id)
);

CREATE INDEX idx_linkable_accounts_owner ON account_linkable_accounts(owner_account_id);

-- RLS
ALTER TABLE account_linkable_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can do anything with linkable accounts"
  ON account_linkable_accounts FOR ALL
  USING (is_staff());

CREATE POLICY "Owner-account members can view their linkable accounts"
  ON account_linkable_accounts FOR SELECT
  USING (is_account_member(owner_account_id));

-- Only staff or users with manage_members permission can insert/update/delete
CREATE POLICY "Account managers can manage linkable accounts"
  ON account_linkable_accounts FOR INSERT
  WITH CHECK (has_account_permission(owner_account_id, 'account.manage_members'));

CREATE POLICY "Account managers can update linkable accounts"
  ON account_linkable_accounts FOR UPDATE
  USING (has_account_permission(owner_account_id, 'account.manage_members'));

CREATE POLICY "Account managers can delete linkable accounts"
  ON account_linkable_accounts FOR DELETE
  USING (has_account_permission(owner_account_id, 'account.manage_members'));

-- ---------------------------------------------------------------------------
-- 2. activity_log.details: structured JSONB for rich update rendering
-- ---------------------------------------------------------------------------

ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS details jsonb;
