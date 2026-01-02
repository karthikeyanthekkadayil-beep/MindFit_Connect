-- Drop restrictive policies and create permissive ones

-- COMMUNITIES: Allow any authenticated user to create
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
CREATE POLICY "Authenticated users can create communities" 
ON public.communities 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- EVENTS: Allow any authenticated user to create events (remove community member requirement)
DROP POLICY IF EXISTS "Community members can create events" ON public.events;
CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- EVENTS: Allow everyone to view all events (not just community members)
DROP POLICY IF EXISTS "Events are viewable by community members" ON public.events;
CREATE POLICY "Events are viewable by everyone" 
ON public.events 
FOR SELECT 
TO authenticated
USING (true);

-- CONVERSATIONS: Ensure any authenticated user can create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- CONVERSATION_MEMBERS: Allow users to add any members to conversations
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_members;
CREATE POLICY "Users can add members to conversations" 
ON public.conversation_members 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- MESSAGES: Allow users to send messages in any conversation they're a member of
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- PROFILES: Allow all authenticated users to view profiles (for messaging/searching users)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);