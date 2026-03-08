
-- Polls table
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_multiple_choice boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Poll votes table
CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls RLS: community members can view
CREATE POLICY "Community members can view polls"
ON public.polls FOR SELECT TO authenticated
USING (is_community_member(auth.uid(), community_id));

-- Polls RLS: community members can create
CREATE POLICY "Community members can create polls"
ON public.polls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_community_member(auth.uid(), community_id));

-- Polls RLS: authors can delete
CREATE POLICY "Poll authors can delete their polls"
ON public.polls FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Polls RLS: admins can delete
CREATE POLICY "Admins can delete polls"
ON public.polls FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Poll votes RLS: community members can view votes
CREATE POLICY "Community members can view poll votes"
ON public.poll_votes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.polls p
  WHERE p.id = poll_votes.poll_id
  AND is_community_member(auth.uid(), p.community_id)
));

-- Poll votes RLS: community members can vote
CREATE POLICY "Community members can vote"
ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_votes.poll_id
    AND is_community_member(auth.uid(), p.community_id)
  )
);

-- Poll votes RLS: users can remove their votes
CREATE POLICY "Users can remove their votes"
ON public.poll_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);
