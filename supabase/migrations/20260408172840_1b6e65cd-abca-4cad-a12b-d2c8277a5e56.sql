
-- Workout plans table
CREATE TABLE public.user_workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_name text NOT NULL DEFAULT 'My Workout Plan',
  monday text,
  tuesday text,
  wednesday text,
  thursday text,
  friday text,
  saturday text,
  sunday text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans" ON public.user_workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workout plans" ON public.user_workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout plans" ON public.user_workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout plans" ON public.user_workout_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_workout_plans_updated_at BEFORE UPDATE ON public.user_workout_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Diet plans table
CREATE TABLE public.user_diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_of_week text NOT NULL,
  meal_slot text NOT NULL,
  meal_name text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_diet_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diet plans" ON public.user_diet_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own diet plans" ON public.user_diet_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diet plans" ON public.user_diet_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diet plans" ON public.user_diet_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_diet_plans_updated_at BEFORE UPDATE ON public.user_diet_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_diet_plans_user ON public.user_diet_plans(user_id);
CREATE INDEX idx_user_workout_plans_user ON public.user_workout_plans(user_id);
