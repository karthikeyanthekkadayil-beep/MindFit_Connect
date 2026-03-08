-- Allow admins to delete communities
CREATE POLICY "Admins can delete communities"
ON public.communities FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update communities
CREATE POLICY "Admins can update communities"
ON public.communities FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete community members (for cascade cleanup)
CREATE POLICY "Admins can delete community members"
ON public.community_members FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete community posts (for cascade cleanup)
CREATE POLICY "Admins can delete community posts"
ON public.community_posts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update conversations
CREATE POLICY "Admins can update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete conversations
CREATE POLICY "Admins can delete conversations"
ON public.conversations FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all conversation members
CREATE POLICY "Admins can view all conversation members"
ON public.conversation_members FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete conversation members (cascade)
CREATE POLICY "Admins can delete conversation members"
ON public.conversation_members FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete messages (cascade)
CREATE POLICY "Admins can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));