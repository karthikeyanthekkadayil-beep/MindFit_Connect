
-- Chat polls table
CREATE TABLE public.chat_polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_multiple_choice boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Chat poll votes table
CREATE TABLE public.chat_poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Pinned messages table
CREATE TABLE public.pinned_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL,
  pinned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

-- Enable RLS
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Chat polls RLS
CREATE POLICY "Conversation members can view chat polls"
ON public.chat_polls FOR SELECT TO authenticated
USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "Conversation members can create chat polls"
ON public.chat_polls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "Poll authors can delete chat polls"
ON public.chat_polls FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Chat poll votes RLS
CREATE POLICY "Conversation members can view chat poll votes"
ON public.chat_poll_votes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chat_polls p
  WHERE p.id = chat_poll_votes.poll_id
  AND p.conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
));

CREATE POLICY "Conversation members can vote on chat polls"
ON public.chat_poll_votes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_polls p
    WHERE p.id = chat_poll_votes.poll_id
    AND p.conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
  )
);

CREATE POLICY "Users can remove their chat poll votes"
ON public.chat_poll_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Pinned messages RLS
CREATE POLICY "Conversation members can view pinned messages"
ON public.pinned_messages FOR SELECT TO authenticated
USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "Conversation members can pin messages"
ON public.pinned_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = pinned_by
  AND conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
);

CREATE POLICY "Conversation members can unpin messages"
ON public.pinned_messages FOR DELETE TO authenticated
USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));
