-- =============================================================================
-- Migration 00009: Auto-create documents storage bucket
-- =============================================================================
-- Ensures the 'documents' bucket exists after reset/migration so document
-- uploads work without any manual Storage setup in Studio.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
