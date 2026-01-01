-- Fix: Remove overly permissive profiles RLS policy that exposes PII
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create owner-only select policy for full profile data
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create a security definer function to safely fetch limited public profile info
-- This is used for social features (community posts, conversations, etc.)
CREATE OR REPLACE FUNCTION public.get_public_profile_info(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM profiles p
  WHERE p.id = profile_id;
$$;

-- Create a function to get multiple profiles at once (for lists)
CREATE OR REPLACE FUNCTION public.get_public_profiles_info(profile_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM profiles p
  WHERE p.id = ANY(profile_ids);
$$;