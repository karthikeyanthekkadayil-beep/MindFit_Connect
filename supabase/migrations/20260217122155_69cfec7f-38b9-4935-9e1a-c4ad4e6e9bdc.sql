
-- Allow conversation members to delete conversations they belong to
CREATE POLICY "Members can delete their conversations"
ON public.conversations
FOR DELETE
USING (id IN (SELECT get_user_conversation_ids(auth.uid())));
