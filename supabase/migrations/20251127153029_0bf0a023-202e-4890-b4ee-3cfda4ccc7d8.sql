-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  calories_per_serving INTEGER,
  protein_grams NUMERIC,
  carbs_grams NUMERIC,
  fat_grams NUMERIC,
  fiber_grams NUMERIC,
  dietary_tags TEXT[] DEFAULT '{}',
  cuisine_type TEXT,
  meal_type TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  instructions TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user meal plans table
CREATE TABLE public.user_meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  servings INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Public recipes are viewable by everyone"
  ON public.recipes FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own recipes"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for user meal plans
CREATE POLICY "Users can view their own meal plans"
  ON public.user_meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal plans"
  ON public.user_meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans"
  ON public.user_meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans"
  ON public.user_meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_recipes_meal_type ON public.recipes(meal_type);
CREATE INDEX idx_recipes_dietary_tags ON public.recipes USING GIN(dietary_tags);
CREATE INDEX idx_recipes_created_by ON public.recipes(created_by);
CREATE INDEX idx_user_meal_plans_user_date ON public.user_meal_plans(user_id, planned_date);
CREATE INDEX idx_user_meal_plans_recipe ON public.user_meal_plans(recipe_id);

-- Create triggers for updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_meal_plans_updated_at
  BEFORE UPDATE ON public.user_meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for meal plans
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_meal_plans;

-- Create recipe-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;