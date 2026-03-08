INSERT INTO public.user_roles (user_id, role)
VALUES ('7bdd02cb-f988-4182-87a3-553cfc9f1b8b', 'moderator')
ON CONFLICT (user_id, role) DO NOTHING;