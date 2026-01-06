
-- Create a security definer function to get user's conversation IDs without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id
  FROM public.conversation_members
  WHERE user_id = _user_id
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;

-- Create a new policy using the security definer function
CREATE POLICY "Users can view members of their conversations"
ON public.conversation_members
FOR SELECT
USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));
