ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;