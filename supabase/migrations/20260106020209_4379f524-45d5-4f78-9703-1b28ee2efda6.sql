
-- Update conversations policies to use the security definer function
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (id IN (SELECT get_user_conversation_ids(auth.uid())));

DROP POLICY IF EXISTS "Conversation members can update" ON public.conversations;
CREATE POLICY "Conversation members can update"
ON public.conversations
FOR UPDATE
USING (id IN (SELECT get_user_conversation_ids(auth.uid())));

-- Update messages policies to use the security definer function
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
);
