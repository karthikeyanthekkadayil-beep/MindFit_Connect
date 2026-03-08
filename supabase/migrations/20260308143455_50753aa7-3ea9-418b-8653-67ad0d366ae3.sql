
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
  ('app_name', '"MindFit Connect"', 'Application display name', 'general'),
  ('app_description', '"A wellness and community platform"', 'Application description', 'general'),
  ('maintenance_mode', 'false', 'Enable maintenance mode to restrict access', 'general'),
  ('welcome_message', '"Welcome to MindFit Connect! Start your wellness journey today."', 'Welcome message shown to new users', 'general'),
  ('max_communities_per_user', '10', 'Maximum communities a user can create', 'policies'),
  ('max_events_per_community', '50', 'Maximum events per community', 'policies'),
  ('require_post_moderation', 'false', 'Require moderator approval for new posts', 'policies'),
  ('auto_ban_report_threshold', '5', 'Number of reports before auto-ban', 'policies'),
  ('allow_public_profiles', 'true', 'Allow users to make profiles public', 'policies'),
  ('feature_messaging', 'true', 'Enable messaging feature', 'features'),
  ('feature_events', 'true', 'Enable events feature', 'features'),
  ('feature_leaderboard', 'true', 'Enable leaderboard feature', 'features'),
  ('feature_workouts', 'true', 'Enable workouts feature', 'features'),
  ('feature_mindfulness', 'true', 'Enable mindfulness feature', 'features'),
  ('feature_nutrition', 'true', 'Enable nutrition feature', 'features'),
  ('feature_goals', 'true', 'Enable goals feature', 'features');

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
