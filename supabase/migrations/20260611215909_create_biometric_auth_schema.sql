-- Users table for biometric authentication system
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  face_enrolled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- Biometric profiles table
CREATE TABLE public.biometric_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  face_descriptor jsonb NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Login attempts / audit log
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  username text NOT NULL,
  success boolean NOT NULL,
  failure_reason text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for users (service role only for write, anon can read own via edge functions)
CREATE POLICY "service_select_users" ON public.users FOR SELECT
  TO service_role USING (true);
CREATE POLICY "service_insert_users" ON public.users FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY "service_update_users" ON public.users FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_delete_users" ON public.users FOR DELETE
  TO service_role USING (true);

-- RLS policies for biometric_profiles (service role only)
CREATE POLICY "service_select_biometric" ON public.biometric_profiles FOR SELECT
  TO service_role USING (true);
CREATE POLICY "service_insert_biometric" ON public.biometric_profiles FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY "service_update_biometric" ON public.biometric_profiles FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_delete_biometric" ON public.biometric_profiles FOR DELETE
  TO service_role USING (true);

-- RLS policies for login_attempts (service role only)
CREATE POLICY "service_select_attempts" ON public.login_attempts FOR SELECT
  TO service_role USING (true);
CREATE POLICY "service_insert_attempts" ON public.login_attempts FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY "service_update_attempts" ON public.login_attempts FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_delete_attempts" ON public.login_attempts FOR DELETE
  TO service_role USING (true);

-- Index for faster username lookups
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_biometric_user_id ON public.biometric_profiles(user_id);
CREATE INDEX idx_login_attempts_user_id ON public.login_attempts(user_id);
