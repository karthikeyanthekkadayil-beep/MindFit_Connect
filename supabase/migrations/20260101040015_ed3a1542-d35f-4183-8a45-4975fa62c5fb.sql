-- Update function to handle empty array (return all profiles for search)
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
  WHERE 
    CASE 
      WHEN array_length(profile_ids, 1) IS NULL OR array_length(profile_ids, 1) = 0 
      THEN true 
      ELSE p.id = ANY(profile_ids) 
    END;
$$;