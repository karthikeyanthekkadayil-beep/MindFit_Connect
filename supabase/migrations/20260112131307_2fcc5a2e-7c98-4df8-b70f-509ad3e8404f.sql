-- Create table for user gamification stats
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for achievements definitions
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  category TEXT NOT NULL,
  points_reward INTEGER NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  badge_color TEXT NOT NULL DEFAULT 'primary',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user earned achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Create table for point transactions (audit trail)
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for user_gamification
CREATE POLICY "Users can view their own gamification stats" 
ON public.user_gamification FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification stats" 
ON public.user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification stats" 
ON public.user_gamification FOR UPDATE USING (auth.uid() = user_id);

-- Policies for achievements (public read)
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Only admins can manage achievements" 
ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements" 
ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for point_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_gamification_user ON public.user_gamification(user_id);
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_point_transactions_user ON public.point_transactions(user_id, created_at DESC);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, points_reward, requirement_type, requirement_value, badge_color) VALUES
-- Workout achievements
('First Steps', 'Complete your first workout', 'dumbbell', 'fitness', 50, 'workouts_completed', 1, 'primary'),
('Workout Warrior', 'Complete 10 workouts', 'flame', 'fitness', 150, 'workouts_completed', 10, 'primary'),
('Fitness Fanatic', 'Complete 50 workouts', 'trophy', 'fitness', 500, 'workouts_completed', 50, 'amber'),
('Iron Will', 'Complete 100 workouts', 'medal', 'fitness', 1000, 'workouts_completed', 100, 'amber'),

-- Streak achievements
('Getting Started', 'Maintain a 3-day streak', 'zap', 'streak', 30, 'streak_days', 3, 'secondary'),
('Week Warrior', 'Maintain a 7-day streak', 'fire', 'streak', 100, 'streak_days', 7, 'secondary'),
('Consistency King', 'Maintain a 30-day streak', 'crown', 'streak', 500, 'streak_days', 30, 'amber'),
('Unstoppable', 'Maintain a 100-day streak', 'star', 'streak', 2000, 'streak_days', 100, 'amber'),

-- Mindfulness achievements
('Calm Mind', 'Complete your first meditation', 'brain', 'mindfulness', 30, 'meditations_completed', 1, 'accent'),
('Inner Peace', 'Complete 10 meditation sessions', 'heart', 'mindfulness', 100, 'meditations_completed', 10, 'accent'),
('Zen Master', 'Complete 50 meditation sessions', 'sparkles', 'mindfulness', 400, 'meditations_completed', 50, 'accent'),

-- Social achievements
('Social Butterfly', 'Join your first community', 'users', 'social', 25, 'communities_joined', 1, 'green'),
('Community Builder', 'Join 5 communities', 'users', 'social', 100, 'communities_joined', 5, 'green'),
('Event Enthusiast', 'Attend your first event', 'calendar', 'social', 50, 'events_attended', 1, 'green'),
('Party Animal', 'Attend 10 events', 'party-popper', 'social', 200, 'events_attended', 10, 'green'),

-- Mood tracking achievements
('Self Aware', 'Log your mood for the first time', 'smile', 'wellness', 20, 'mood_entries', 1, 'pink'),
('Mood Master', 'Log your mood for 7 consecutive days', 'heart-pulse', 'wellness', 100, 'mood_entries', 7, 'pink'),
('Emotional Intelligence', 'Log your mood for 30 days', 'brain', 'wellness', 300, 'mood_entries', 30, 'pink'),

-- Level achievements
('Rising Star', 'Reach level 5', 'trending-up', 'level', 100, 'level_reached', 5, 'primary'),
('Achiever', 'Reach level 10', 'award', 'level', 250, 'level_reached', 10, 'amber'),
('Champion', 'Reach level 25', 'trophy', 'level', 750, 'level_reached', 25, 'amber'),
('Legend', 'Reach level 50', 'crown', 'level', 2000, 'level_reached', 50, 'amber');