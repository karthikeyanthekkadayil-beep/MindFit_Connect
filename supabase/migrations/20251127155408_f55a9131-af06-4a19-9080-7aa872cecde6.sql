-- Fix security definer view by recreating without security definer
DROP VIEW IF EXISTS public.shared_goals_view;

-- Recreate view without security definer (it will use invoker's permissions)
CREATE VIEW public.shared_goals_view 
WITH (security_invoker = true)
AS
SELECT 
  ug.*,
  p.full_name as owner_name,
  p.avatar_url as owner_avatar,
  (
    SELECT COUNT(*) 
    FROM public.goal_interactions gi 
    WHERE gi.goal_id = ug.id AND gi.interaction_type = 'cheer'
  ) as cheer_count,
  (
    SELECT COUNT(*) 
    FROM public.goal_interactions gi 
    WHERE gi.goal_id = ug.id AND gi.interaction_type = 'comment'
  ) as comment_count
FROM public.user_goals ug
JOIN public.profiles p ON ug.user_id = p.id
WHERE ug.is_public = true
   OR ug.id IN (
     SELECT goal_id FROM public.goal_shares WHERE shared_with_type IN ('user', 'community')
   );