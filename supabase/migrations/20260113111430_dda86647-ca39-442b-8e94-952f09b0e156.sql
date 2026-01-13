-- Create a secure view for leaderboard data that only exposes necessary public information
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  ug.user_id,
  p.full_name,
  p.avatar_url,
  ug.total_points,
  ug.current_level,
  ug.current_streak,
  ug.longest_streak,
  (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = ug.user_id) as achievement_count
FROM user_gamification ug
JOIN profiles p ON p.id = ug.user_id
WHERE (p.privacy_settings->>'profile_visible')::boolean IS NOT FALSE
ORDER BY ug.total_points DESC;

-- Enable RLS on the view by creating appropriate policies
-- First, let's create a function to get leaderboard data securely
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  total_points integer,
  current_level integer,
  current_streak integer,
  longest_streak integer,
  achievement_count bigint,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ug.user_id,
    p.full_name,
    p.avatar_url,
    ug.total_points,
    ug.current_level,
    ug.current_streak,
    ug.longest_streak,
    (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = ug.user_id) as achievement_count,
    ROW_NUMBER() OVER (ORDER BY ug.total_points DESC) as rank
  FROM user_gamification ug
  JOIN profiles p ON p.id = ug.user_id
  WHERE (p.privacy_settings->>'profile_visible')::boolean IS NOT FALSE
  ORDER BY ug.total_points DESC
  LIMIT limit_count;
END;
$$;

-- Function to get community leaderboard
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(community_uuid uuid, limit_count integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  total_points integer,
  current_level integer,
  current_streak integer,
  longest_streak integer,
  achievement_count bigint,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ug.user_id,
    p.full_name,
    p.avatar_url,
    ug.total_points,
    ug.current_level,
    ug.current_streak,
    ug.longest_streak,
    (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = ug.user_id) as achievement_count,
    ROW_NUMBER() OVER (ORDER BY ug.total_points DESC) as rank
  FROM user_gamification ug
  JOIN profiles p ON p.id = ug.user_id
  JOIN community_members cm ON cm.user_id = ug.user_id
  WHERE cm.community_id = community_uuid
    AND (p.privacy_settings->>'profile_visible')::boolean IS NOT FALSE
  ORDER BY ug.total_points DESC
  LIMIT limit_count;
END;
$$;

-- Function to get user's rank
CREATE OR REPLACE FUNCTION public.get_user_rank(target_user_id uuid)
RETURNS TABLE (
  global_rank bigint,
  total_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_points integer;
BEGIN
  -- Get user's points
  SELECT ug.total_points INTO user_points
  FROM user_gamification ug
  WHERE ug.user_id = target_user_id;

  IF user_points IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) + 1 FROM user_gamification ug2 WHERE ug2.total_points > user_points)::bigint as global_rank,
    (SELECT COUNT(*) FROM user_gamification)::bigint as total_users;
END;
$$;