-- Content Reports table
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports" ON public.content_reports
  FOR SELECT USING (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Moderators can update reports" ON public.content_reports
  FOR UPDATE USING (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- User Warnings table
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  moderator_id uuid NOT NULL,
  reason text NOT NULL,
  warning_type text NOT NULL DEFAULT 'warning',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can issue warnings" ON public.user_warnings
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Moderators can view warnings" ON public.user_warnings
  FOR SELECT USING (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view own warnings" ON public.user_warnings
  FOR SELECT USING (auth.uid() = user_id);