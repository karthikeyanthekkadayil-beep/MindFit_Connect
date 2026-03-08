
-- Function: auto-create a group conversation when a community is created
CREATE OR REPLACE FUNCTION public.create_community_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  -- Create conversation linked to the community
  INSERT INTO public.conversations (type, name, community_id)
  VALUES ('group', NEW.name, NEW.id)
  RETURNING id INTO _conv_id;

  -- Add the creator as the first member
  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (_conv_id, NEW.creator_id);

  RETURN NEW;
END;
$$;

-- Trigger: fires after a new community is created
CREATE TRIGGER on_community_created
AFTER INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.create_community_conversation();

-- Function: auto-add/remove members from the community conversation
CREATE OR REPLACE FUNCTION public.sync_community_conversation_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Find the community's conversation
    SELECT id INTO _conv_id
    FROM public.conversations
    WHERE community_id = NEW.community_id
    LIMIT 1;

    IF _conv_id IS NOT NULL THEN
      INSERT INTO public.conversation_members (conversation_id, user_id)
      VALUES (_conv_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT id INTO _conv_id
    FROM public.conversations
    WHERE community_id = OLD.community_id
    LIMIT 1;

    IF _conv_id IS NOT NULL THEN
      DELETE FROM public.conversation_members
      WHERE conversation_id = _conv_id AND user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger: fires after community_members insert or delete
CREATE TRIGGER on_community_member_changed
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_community_conversation_member();

-- Backfill: create conversations for existing communities that don't have one
INSERT INTO public.conversations (type, name, community_id)
SELECT 'group', c.name, c.id
FROM public.communities c
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversations conv WHERE conv.community_id = c.id
);

-- Backfill: add existing community members to their community conversations
INSERT INTO public.conversation_members (conversation_id, user_id)
SELECT conv.id, cm.user_id
FROM public.community_members cm
JOIN public.conversations conv ON conv.community_id = cm.community_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_members existing
  WHERE existing.conversation_id = conv.id AND existing.user_id = cm.user_id
);
