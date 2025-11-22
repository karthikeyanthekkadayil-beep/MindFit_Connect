-- Create storage bucket for exercise media
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', true);

-- Create exercises table
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  muscle_groups TEXT[] NOT NULL,
  equipment_needed TEXT[],
  duration_minutes INTEGER,
  calories_burned INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workouts table (pre-made workout routines)
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  category TEXT NOT NULL,
  total_duration_minutes INTEGER,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_exercises junction table
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL,
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_custom_workouts table
CREATE TABLE public.user_custom_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  completion_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workout_id)
);

-- Create indexes for performance
CREATE INDEX idx_exercises_difficulty ON public.exercises(difficulty_level);
CREATE INDEX idx_exercises_muscle_groups ON public.exercises USING GIN(muscle_groups);
CREATE INDEX idx_workouts_difficulty ON public.workouts(difficulty_level);
CREATE INDEX idx_workouts_category ON public.workouts(category);
CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX idx_user_custom_workouts_user ON public.user_custom_workouts(user_id);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_workouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercises (public read, admin write)
CREATE POLICY "Exercises are viewable by everyone"
  ON public.exercises FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exercises"
  ON public.exercises FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for workouts
CREATE POLICY "Public workouts are viewable by everyone"
  ON public.workouts FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for workout_exercises
CREATE POLICY "Workout exercises are viewable by everyone"
  ON public.workout_exercises FOR SELECT
  USING (true);

CREATE POLICY "Users can manage exercises in their workouts"
  ON public.workout_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.created_by = auth.uid()
    )
  );

-- RLS Policies for user_custom_workouts
CREATE POLICY "Users can view their own custom workouts"
  ON public.user_custom_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom workouts"
  ON public.user_custom_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom workouts"
  ON public.user_custom_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom workouts"
  ON public.user_custom_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for exercise media
CREATE POLICY "Exercise media is viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exercise-media');

CREATE POLICY "Admins can upload exercise media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exercise-media' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update exercise media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'exercise-media'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Triggers for updated_at
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();