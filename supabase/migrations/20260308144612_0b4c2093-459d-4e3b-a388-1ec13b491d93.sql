
INSERT INTO public.platform_settings (key, value, description, category) VALUES
  ('mod_can_review_reports', 'true', 'Allow moderators to review and resolve content reports', 'moderator'),
  ('mod_can_issue_warnings', 'true', 'Allow moderators to issue warnings to users', 'moderator'),
  ('mod_can_delete_content', 'true', 'Allow moderators to delete posts and comments', 'moderator'),
  ('mod_can_ban_users', 'false', 'Allow moderators to ban or suspend users', 'moderator'),
  ('mod_max_warnings_per_day', '10', 'Maximum warnings a moderator can issue per day', 'moderator'),
  ('mod_require_notes', 'true', 'Require moderators to add notes when taking actions', 'moderator');
