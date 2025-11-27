-- Create meditation programs table
CREATE TABLE public.meditation_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  audio_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  instructions TEXT NOT NULL,
  benefits TEXT[],
  tags TEXT[] DEFAULT '{}',
  is_guided BOOLEAN DEFAULT true,
  voice_gender TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create breathing exercises table
CREATE TABLE public.breathing_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  technique_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  inhale_seconds INTEGER NOT NULL,
  hold_seconds INTEGER,
  exhale_seconds INTEGER NOT NULL,
  rest_seconds INTEGER,
  cycles INTEGER DEFAULT 1,
  benefits TEXT[],
  difficulty_level TEXT NOT NULL,
  instructions TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user meditation sessions table
CREATE TABLE public.user_meditation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id UUID REFERENCES public.meditation_programs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.breathing_exercises(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  mood_before TEXT,
  mood_after TEXT,
  notes TEXT,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meditation_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathing_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meditation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meditation programs
CREATE POLICY "Public meditation programs are viewable by everyone"
  ON public.meditation_programs FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create meditation programs"
  ON public.meditation_programs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own programs"
  ON public.meditation_programs FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own programs"
  ON public.meditation_programs FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for breathing exercises
CREATE POLICY "Breathing exercises are viewable by everyone"
  ON public.breathing_exercises FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage breathing exercises"
  ON public.breathing_exercises FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user meditation sessions
CREATE POLICY "Users can view their own sessions"
  ON public.user_meditation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.user_meditation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.user_meditation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.user_meditation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_meditation_programs_category ON public.meditation_programs(category);
CREATE INDEX idx_meditation_programs_difficulty ON public.meditation_programs(difficulty_level);
CREATE INDEX idx_breathing_exercises_type ON public.breathing_exercises(technique_type);
CREATE INDEX idx_user_sessions_user_date ON public.user_meditation_sessions(user_id, session_date);
CREATE INDEX idx_user_sessions_program ON public.user_meditation_sessions(program_id);

-- Create triggers
CREATE TRIGGER update_meditation_programs_updated_at
  BEFORE UPDATE ON public.meditation_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_breathing_exercises_updated_at
  BEFORE UPDATE ON public.breathing_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_meditation_sessions;

-- Insert sample breathing exercises
INSERT INTO public.breathing_exercises (name, description, technique_type, duration_minutes, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds, cycles, benefits, difficulty_level, instructions) VALUES
('Box Breathing', 'A calming technique used by Navy SEALs to maintain focus under stress', 'box', 5, 4, 4, 4, 4, 5, ARRAY['Reduces stress', 'Improves focus', 'Lowers blood pressure'], 'beginner', 'Breathe in for 4 seconds, hold for 4 seconds, exhale for 4 seconds, rest for 4 seconds. Repeat.'),
('4-7-8 Breathing', 'Dr. Weil''s relaxation technique for better sleep and anxiety relief', 'counted', 4, 4, 7, 8, 0, 4, ARRAY['Promotes sleep', 'Reduces anxiety', 'Calms nervous system'], 'beginner', 'Inhale through nose for 4 counts, hold breath for 7 counts, exhale through mouth for 8 counts.'),
('Diaphragmatic Breathing', 'Deep belly breathing to activate the parasympathetic nervous system', 'deep', 10, 5, 2, 6, 2, 8, ARRAY['Reduces stress', 'Improves oxygen flow', 'Strengthens diaphragm'], 'beginner', 'Place hand on belly. Breathe deeply into abdomen, feeling it rise. Exhale slowly.'),
('Alternate Nostril', 'Ancient yogic practice for balancing left and right brain hemispheres', 'pranayama', 8, 4, 4, 4, 0, 10, ARRAY['Balances energy', 'Improves focus', 'Reduces stress'], 'intermediate', 'Close right nostril, inhale left. Close left, exhale right. Inhale right, close, exhale left. Repeat.'),
('Coherent Breathing', 'Breathe at 5 breaths per minute for optimal heart rate variability', 'rhythmic', 10, 6, 0, 6, 0, 10, ARRAY['Improves HRV', 'Reduces stress', 'Enhances calm'], 'beginner', 'Breathe in for 6 seconds, breathe out for 6 seconds. Maintain steady rhythm.');

-- Insert sample meditation programs
INSERT INTO public.meditation_programs (title, description, category, difficulty_level, duration_minutes, instructions, benefits, tags, is_guided, voice_gender) VALUES
('Morning Mindfulness', 'Start your day with presence and intention', 'mindfulness', 'beginner', 10, 'Find a comfortable seated position. Close your eyes and bring awareness to your breath. Notice the sensation of breathing without trying to change it.', ARRAY['Increases awareness', 'Reduces stress', 'Improves focus'], ARRAY['morning', 'daily'], true, 'neutral'),
('Body Scan for Sleep', 'Release tension and prepare for restful sleep', 'body_scan', 'beginner', 20, 'Lie down comfortably. Starting from your toes, slowly bring attention to each part of your body, releasing tension as you go.', ARRAY['Improves sleep', 'Releases tension', 'Promotes relaxation'], ARRAY['evening', 'sleep'], true, 'female'),
('Loving-Kindness Meditation', 'Cultivate compassion for yourself and others', 'loving_kindness', 'intermediate', 15, 'Sit comfortably and repeat phrases of goodwill: "May I be happy, may I be healthy, may I be safe." Extend these wishes to others.', ARRAY['Increases compassion', 'Reduces negative emotions', 'Improves relationships'], ARRAY['compassion', 'emotional'], true, 'female'),
('Stress Relief Visualization', 'Use imagery to release stress and find calm', 'visualization', 'beginner', 12, 'Close your eyes and imagine a peaceful place. Engage all your senses - what do you see, hear, smell, and feel?', ARRAY['Reduces stress', 'Promotes calm', 'Enhances creativity'], ARRAY['stress', 'relaxation'], true, 'neutral'),
('Focus and Concentration', 'Train your mind to stay present and focused', 'concentration', 'intermediate', 15, 'Choose an object of focus (breath, sound, or visual point). When mind wanders, gently return attention to the object.', ARRAY['Improves focus', 'Enhances productivity', 'Reduces mind-wandering'], ARRAY['focus', 'productivity'], true, 'male');