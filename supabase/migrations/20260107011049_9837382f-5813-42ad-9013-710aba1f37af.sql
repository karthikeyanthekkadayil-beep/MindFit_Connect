-- Fix the conversations INSERT policy - change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);
