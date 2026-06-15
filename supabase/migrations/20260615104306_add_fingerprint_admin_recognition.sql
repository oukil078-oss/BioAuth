-- Add fingerprint and admin fields to users
ALTER TABLE public.users 
  ADD COLUMN fingerprint_enrolled boolean NOT NULL DEFAULT false,
  ADD COLUMN account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN display_label text,
  ADD COLUMN last_seen_at timestamptz,
  ADD COLUMN recognition_count integer NOT NULL DEFAULT 0;

-- Fingerprint credentials table (stores WebAuthn credential IDs)
CREATE TABLE public.fingerprint_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(credential_id)
);

-- Recognition events table for admin dashboard
CREATE TABLE public.recognition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matched_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  matched_username text,
  is_unknown boolean NOT NULL DEFAULT false,
  confidence numeric,
  camera_session_id text,
  detected_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fingerprint_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for fingerprint_credentials (service role only)
CREATE POLICY "service_select_fingerprint" ON public.fingerprint_credentials FOR SELECT TO service_role USING (true);
CREATE POLICY "service_insert_fingerprint" ON public.fingerprint_credentials FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_update_fingerprint" ON public.fingerprint_credentials FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_delete_fingerprint" ON public.fingerprint_credentials FOR DELETE TO service_role USING (true);

-- RLS policies for recognition_events (service role only)
CREATE POLICY "service_select_events" ON public.recognition_events FOR SELECT TO service_role USING (true);
CREATE POLICY "service_insert_events" ON public.recognition_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_update_events" ON public.recognition_events FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_delete_events" ON public.recognition_events FOR DELETE TO service_role USING (true);

-- Indexes
CREATE INDEX idx_fingerprint_user_id ON public.fingerprint_credentials(user_id);
CREATE INDEX idx_recognition_events_detected_at ON public.recognition_events(detected_at DESC);
CREATE INDEX idx_recognition_events_user ON public.recognition_events(matched_user_id);
CREATE INDEX idx_users_account_status ON public.users(account_status);
CREATE INDEX idx_users_is_admin ON public.users(is_admin);
