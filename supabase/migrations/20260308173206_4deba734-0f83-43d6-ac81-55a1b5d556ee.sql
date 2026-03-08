
-- Problem reports table
CREATE TABLE public.problem_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  admin_response text,
  responded_by uuid,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "Users can create their own problem reports"
  ON public.problem_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own problem reports"
  ON public.problem_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all problem reports"
  ON public.problem_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update reports (respond)
CREATE POLICY "Admins can update problem reports"
  ON public.problem_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_problem_reports_updated_at
  BEFORE UPDATE ON public.problem_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
