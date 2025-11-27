-- Create user goals table
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('fitness', 'meditation', 'nutrition', 'community', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_goals
CREATE POLICY "Users can view their own goals"
  ON public.user_goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON public.user_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.user_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.user_goals
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public goals are viewable by everyone"
  ON public.user_goals
  FOR SELECT
  USING (is_public = true);

-- Create indexes for performance
CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_user_goals_status ON public.user_goals(status);
CREATE INDEX idx_user_goals_type ON public.user_goals(goal_type);
CREATE INDEX idx_user_goals_end_date ON public.user_goals(end_date);

-- Trigger for updated_at
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create goal milestones table for tracking progress checkpoints
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.user_goals(id) ON DELETE CASCADE,
  milestone_value NUMERIC NOT NULL,
  achieved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for milestones
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their goals"
  ON public.goal_milestones
  FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM public.user_goals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create milestones for their goals"
  ON public.goal_milestones
  FOR INSERT
  WITH CHECK (
    goal_id IN (
      SELECT id FROM public.user_goals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones for their goals"
  ON public.goal_milestones
  FOR UPDATE
  USING (
    goal_id IN (
      SELECT id FROM public.user_goals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones for their goals"
  ON public.goal_milestones
  FOR DELETE
  USING (
    goal_id IN (
      SELECT id FROM public.user_goals WHERE user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);