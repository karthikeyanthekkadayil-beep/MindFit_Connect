-- Create a security definer function to check if user is a community member
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id AND community_id = _community_id
  )
$$;

-- Create a security definer function to check if user has a specific role in community
CREATE OR REPLACE FUNCTION public.has_community_role(_user_id uuid, _community_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id 
      AND community_id = _community_id
      AND role = ANY(_roles)
  )
$$;

-- Create a function to get community IDs where user is a member
CREATE OR REPLACE FUNCTION public.get_user_community_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT community_id
  FROM public.community_members
  WHERE user_id = _user_id
$$;

-- Create a function to get community IDs where user has specific roles
CREATE OR REPLACE FUNCTION public.get_user_community_ids_by_role(_user_id uuid, _roles text[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT community_id
  FROM public.community_members
  WHERE user_id = _user_id AND role = ANY(_roles)
$$;

-- Drop existing policies on community_members that cause recursion
DROP POLICY IF EXISTS "Community members are viewable by everyone" ON public.community_members;
DROP POLICY IF EXISTS "Community owners can manage members" ON public.community_members;
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;

-- Create new non-recursive policies for community_members
CREATE POLICY "Community members are viewable by everyone"
ON public.community_members
FOR SELECT
USING (true);

CREATE POLICY "Users can join communities"
ON public.community_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
ON public.community_members
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Community owners can manage members"
ON public.community_members
FOR ALL
USING (
  public.has_community_role(auth.uid(), community_id, ARRAY['owner'])
);

-- Fix communities table policies to avoid recursion
DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON public.communities;
DROP POLICY IF EXISTS "Community owners and moderators can update" ON public.communities;

CREATE POLICY "Public communities are viewable by everyone"
ON public.communities
FOR SELECT
USING (
  (NOT is_private) OR public.is_community_member(auth.uid(), id)
);

CREATE POLICY "Community owners and moderators can update"
ON public.communities
FOR UPDATE
USING (
  public.has_community_role(auth.uid(), id, ARRAY['owner', 'moderator'])
);

-- Fix events table policies to avoid recursion
DROP POLICY IF EXISTS "Events are viewable by community members" ON public.events;
DROP POLICY IF EXISTS "Community members can create events" ON public.events;
DROP POLICY IF EXISTS "Event creators and community moderators can update" ON public.events;
DROP POLICY IF EXISTS "Event creators and community owners can delete" ON public.events;

CREATE POLICY "Events are viewable by community members"
ON public.events
FOR SELECT
USING (
  public.is_community_member(auth.uid(), community_id) OR
  EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND NOT is_private)
);

CREATE POLICY "Community members can create events"
ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id AND public.is_community_member(auth.uid(), community_id)
);

CREATE POLICY "Event creators and community moderators can update"
ON public.events
FOR UPDATE
USING (
  creator_id = auth.uid() OR 
  public.has_community_role(auth.uid(), community_id, ARRAY['owner', 'moderator'])
);

CREATE POLICY "Event creators and community owners can delete"
ON public.events
FOR DELETE
USING (
  creator_id = auth.uid() OR 
  public.has_community_role(auth.uid(), community_id, ARRAY['owner'])
);

-- Fix event_rsvps policies
DROP POLICY IF EXISTS "RSVPs are viewable by community members" ON public.event_rsvps;

CREATE POLICY "RSVPs are viewable by community members"
ON public.event_rsvps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND public.is_community_member(auth.uid(), e.community_id)
  )
);

-- Fix community_posts policies
DROP POLICY IF EXISTS "Community members can view posts" ON public.community_posts;
DROP POLICY IF EXISTS "Community members can create posts" ON public.community_posts;

CREATE POLICY "Community members can view posts"
ON public.community_posts
FOR SELECT
USING (public.is_community_member(auth.uid(), community_id));

CREATE POLICY "Community members can create posts"
ON public.community_posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND public.is_community_member(auth.uid(), community_id)
);

-- Fix post_comments policies
DROP POLICY IF EXISTS "Community members can view comments" ON public.post_comments;
DROP POLICY IF EXISTS "Community members can create comments" ON public.post_comments;

CREATE POLICY "Community members can view comments"
ON public.post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts cp
    WHERE cp.id = post_id 
    AND public.is_community_member(auth.uid(), cp.community_id)
  )
);

CREATE POLICY "Community members can create comments"
ON public.post_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.community_posts cp
    WHERE cp.id = post_id 
    AND public.is_community_member(auth.uid(), cp.community_id)
  )
);

-- Fix post_reactions policies
DROP POLICY IF EXISTS "Community members can view reactions" ON public.post_reactions;

CREATE POLICY "Community members can view reactions"
ON public.post_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts cp
    WHERE cp.id = post_id 
    AND public.is_community_member(auth.uid(), cp.community_id)
  )
);