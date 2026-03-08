-- Fix 1: Convert leaderboard_view to security invoker
DROP VIEW IF EXISTS public.leaderboard_view;
CREATE VIEW public.leaderboard_view
WITH (security_invoker=on) AS
SELECT ug.user_id,
    p.full_name,
    p.avatar_url,
    ug.total_points,
    ug.current_level,
    ug.current_streak,
    ug.longest_streak,
    ( SELECT count(*) AS count
           FROM user_achievements ua
          WHERE (ua.user_id = ug.user_id)) AS achievement_count
   FROM (user_gamification ug
     JOIN profiles p ON ((p.id = ug.user_id)))
  WHERE (((p.privacy_settings ->> 'profile_visible'::text))::boolean IS NOT FALSE)
  ORDER BY ug.total_points DESC;

-- Fix 2: Set search_path on functions missing it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_community_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities
    SET member_count = member_count - 1
    WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_event_participant_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'going' THEN
    UPDATE public.events
    SET current_participants = current_participants + 1
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'going' AND NEW.status = 'going' THEN
      UPDATE public.events
      SET current_participants = current_participants + 1
      WHERE id = NEW.event_id;
    ELSIF OLD.status = 'going' AND NEW.status != 'going' THEN
      UPDATE public.events
      SET current_participants = current_participants - 1
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'going' THEN
    UPDATE public.events
    SET current_participants = current_participants - 1
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix 3: Tighten permissive RLS policies
DROP POLICY IF EXISTS "Users can add members to conversations" ON public.conversation_members;
CREATE POLICY "Users can add members to conversations"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);