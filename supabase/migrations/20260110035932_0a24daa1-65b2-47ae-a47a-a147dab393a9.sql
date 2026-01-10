-- Create workout_sessions table to track overall workout sessions
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused', 'cancelled')),
  total_duration_seconds INTEGER,
  calories_burned INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_session_logs table to track individual exercise sets
CREATE TABLE public.workout_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  weight_used NUMERIC,
  weight_unit TEXT DEFAULT 'kg',
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_sessions
CREATE POLICY "Users can view their own workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions"
  ON public.workout_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sessions"
  ON public.workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for workout_session_logs
CREATE POLICY "Users can view their own session logs"
  ON public.workout_session_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = workout_session_logs.session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own session logs"
  ON public.workout_session_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = workout_session_logs.session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own session logs"
  ON public.workout_session_logs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = workout_session_logs.session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own session logs"
  ON public.workout_session_logs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = workout_session_logs.session_id AND ws.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_workout_id ON public.workout_sessions(workout_id);
CREATE INDEX idx_workout_session_logs_session_id ON public.workout_session_logs(session_id);

-- Trigger for updated_at on workout_sessions
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();