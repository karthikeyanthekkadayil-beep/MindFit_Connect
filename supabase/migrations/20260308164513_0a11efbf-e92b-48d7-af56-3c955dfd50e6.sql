-- ================================================
-- FIX 1: Profiles - restrict sensitive data exposure
-- ================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Users can read their own full profile
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Other users can only see non-sensitive fields via RPC (get_public_profile_info / get_public_profiles_info already exist)
-- Admin can view all profiles for management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Moderators can view basic profile info for moderation
CREATE POLICY "Moderators can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'));

-- ================================================
-- FIX 2: Conversation members - prevent unauthorized joining
-- ================================================

DROP POLICY IF EXISTS "Users can add members to conversations" ON public.conversation_members;

-- Only allow adding members if you're already in the conversation
CREATE POLICY "Existing members can add members to conversations"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
  OR NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id)
);

-- ================================================
-- FIX 3: Achievements - prevent self-awarding
-- ================================================

DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;

-- Create a secure function to award achievements with validation
CREATE OR REPLACE FUNCTION public.award_achievement(_user_id uuid, _achievement_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req_type text;
  _req_value integer;
  _actual_value bigint;
  _already_earned boolean;
BEGIN
  -- Check if already earned
  SELECT EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = _user_id AND achievement_id = _achievement_id
  ) INTO _already_earned;
  
  IF _already_earned THEN RETURN false; END IF;

  -- Get achievement requirements
  SELECT requirement_type, requirement_value 
  INTO _req_type, _req_value
  FROM achievements 
  WHERE id = _achievement_id AND is_active = true;
  
  IF _req_type IS NULL THEN RETURN false; END IF;

  -- Validate against actual user data
  CASE _req_type
    WHEN 'workouts_completed' THEN
      SELECT COUNT(*) INTO _actual_value FROM workout_sessions 
      WHERE user_id = _user_id AND status = 'completed';
    WHEN 'meditations_completed' THEN
      SELECT COUNT(*) INTO _actual_value FROM user_meditation_sessions 
      WHERE user_id = _user_id AND completed = true;
    WHEN 'communities_joined' THEN
      SELECT COUNT(*) INTO _actual_value FROM community_members 
      WHERE user_id = _user_id;
    WHEN 'events_attended' THEN
      SELECT COUNT(*) INTO _actual_value FROM event_rsvps 
      WHERE user_id = _user_id AND status = 'going';
    WHEN 'mood_entries' THEN
      SELECT COUNT(*) INTO _actual_value FROM mood_stress_entries 
      WHERE user_id = _user_id;
    WHEN 'streak_days' THEN
      SELECT current_streak INTO _actual_value FROM user_gamification 
      WHERE user_id = _user_id;
    WHEN 'level_reached' THEN
      SELECT current_level INTO _actual_value FROM user_gamification 
      WHERE user_id = _user_id;
    ELSE
      RETURN false;
  END CASE;

  IF _actual_value >= _req_value THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, _achievement_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ================================================
-- FIX 4: Point transactions - prevent score inflation
-- ================================================

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.point_transactions;

-- Create a secure function for adding points
CREATE OR REPLACE FUNCTION public.add_points(
  _user_id uuid,
  _points integer,
  _transaction_type text,
  _description text DEFAULT NULL,
  _reference_type text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the user to add points for themselves
  IF _user_id != auth.uid() THEN RETURN false; END IF;
  
  -- Cap points per transaction to prevent abuse (max 200 per transaction)
  IF _points > 200 OR _points < 0 THEN RETURN false; END IF;
  
  -- Validate transaction type
  IF _transaction_type NOT IN ('workout', 'meditation', 'breathing', 'mood_log', 'achievement', 'streak_bonus', 'community_join', 'event_attend') THEN
    RETURN false;
  END IF;

  INSERT INTO point_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
  VALUES (_user_id, _points, _transaction_type, _description, _reference_type, _reference_id);
  
  -- Update gamification stats
  UPDATE user_gamification 
  SET total_points = total_points + _points,
      updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN true;
END;
$$;

-- ================================================
-- FIX 5: Community members - restrict private community visibility
-- ================================================

DROP POLICY IF EXISTS "Community members are viewable by everyone" ON public.community_members;

CREATE POLICY "Community members viewable by authenticated users"
ON public.community_members
FOR SELECT
TO authenticated
USING (
  -- Public communities: anyone can see members
  EXISTS (
    SELECT 1 FROM communities c 
    WHERE c.id = community_members.community_id AND c.is_private = false
  )
  -- Private communities: only members can see other members
  OR is_community_member(auth.uid(), community_id)
);