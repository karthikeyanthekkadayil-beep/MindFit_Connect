-- Create goal shares table to track who goals are shared with
CREATE TABLE IF NOT EXISTS public.goal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.user_goals(id) ON DELETE CASCADE,
  shared_with_type TEXT NOT NULL CHECK (shared_with_type IN ('user', 'community', 'public')),
  shared_with_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_shares
CREATE POLICY "Goal owners can manage shares"
  ON public.goal_shares
  FOR ALL
  USING (
    goal_id IN (
      SELECT id FROM public.user_goals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view shares for their goals"
  ON public.goal_shares
  FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM public.user_goals WHERE user_id = auth.uid()
    )
    OR shared_with_id = auth.uid()
    OR shared_with_type = 'public'
  );

-- Create goal interactions table for support and encouragement
CREATE TABLE IF NOT EXISTS public.goal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.user_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('cheer', 'comment')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_interactions
CREATE POLICY "Users can create interactions on shared goals"
  ON public.goal_interactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Goal is public
      goal_id IN (SELECT id FROM public.user_goals WHERE is_public = true)
      OR
      -- Goal is shared with user
      goal_id IN (
        SELECT goal_id FROM public.goal_shares 
        WHERE shared_with_id = auth.uid() 
        AND shared_with_type = 'user'
      )
      OR
      -- Goal is shared with user's communities
      goal_id IN (
        SELECT gs.goal_id 
        FROM public.goal_shares gs
        JOIN public.community_members cm ON gs.shared_with_id = cm.community_id
        WHERE cm.user_id = auth.uid()
        AND gs.shared_with_type = 'community'
      )
      OR
      -- User is the goal owner
      goal_id IN (SELECT id FROM public.user_goals WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view interactions on accessible goals"
  ON public.goal_interactions
  FOR SELECT
  USING (
    -- Goal is public
    goal_id IN (SELECT id FROM public.user_goals WHERE is_public = true)
    OR
    -- Goal is shared with user
    goal_id IN (
      SELECT goal_id FROM public.goal_shares 
      WHERE shared_with_id = auth.uid() 
      AND shared_with_type = 'user'
    )
    OR
    -- Goal is shared with user's communities
    goal_id IN (
      SELECT gs.goal_id 
      FROM public.goal_shares gs
      JOIN public.community_members cm ON gs.shared_with_id = cm.community_id
      WHERE cm.user_id = auth.uid()
      AND gs.shared_with_type = 'community'
    )
    OR
    -- User is the goal owner
    goal_id IN (SELECT id FROM public.user_goals WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own interactions"
  ON public.goal_interactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_goal_shares_goal_id ON public.goal_shares(goal_id);
CREATE INDEX idx_goal_shares_shared_with ON public.goal_shares(shared_with_id);
CREATE INDEX idx_goal_interactions_goal_id ON public.goal_interactions(goal_id);
CREATE INDEX idx_goal_interactions_user_id ON public.goal_interactions(user_id);

-- Create view for shared goals with owner info
CREATE OR REPLACE VIEW public.shared_goals_view AS
SELECT 
  ug.*,
  p.full_name as owner_name,
  p.avatar_url as owner_avatar,
  (
    SELECT COUNT(*) 
    FROM public.goal_interactions gi 
    WHERE gi.goal_id = ug.id AND gi.interaction_type = 'cheer'
  ) as cheer_count,
  (
    SELECT COUNT(*) 
    FROM public.goal_interactions gi 
    WHERE gi.goal_id = ug.id AND gi.interaction_type = 'comment'
  ) as comment_count
FROM public.user_goals ug
JOIN public.profiles p ON ug.user_id = p.id
WHERE ug.is_public = true
   OR ug.id IN (
     SELECT goal_id FROM public.goal_shares WHERE shared_with_type IN ('user', 'community')
   );