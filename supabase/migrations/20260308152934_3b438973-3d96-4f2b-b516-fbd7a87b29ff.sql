
-- Drop existing INSERT policies for communities and events
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

-- New policy: only moderators and admins can create communities
CREATE POLICY "Moderators and admins can create communities"
ON public.communities
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
  AND (
    has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- New policy: only moderators and admins can create events
CREATE POLICY "Moderators and admins can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
  AND (
    has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
