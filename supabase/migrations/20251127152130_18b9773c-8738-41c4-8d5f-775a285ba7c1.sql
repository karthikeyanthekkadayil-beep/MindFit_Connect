-- Create community_posts table
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'general' CHECK (post_type IN ('progress', 'question', 'achievement', 'general')),
  image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_comments table
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_reactions table
CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'celebrate', 'support', 'love', 'strong')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_posts
CREATE POLICY "Community members can view posts"
  ON public.community_posts
  FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can create posts"
  ON public.community_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    community_id IN (
      SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can update their posts"
  ON public.community_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Post authors can delete their posts"
  ON public.community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_comments
CREATE POLICY "Community members can view comments"
  ON public.post_comments
  FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.community_posts WHERE community_id IN (
        SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Community members can create comments"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    post_id IN (
      SELECT id FROM public.community_posts WHERE community_id IN (
        SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Comment authors can update their comments"
  ON public.post_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Comment authors can delete their comments"
  ON public.post_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_reactions
CREATE POLICY "Community members can view reactions"
  ON public.post_reactions
  FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.community_posts WHERE community_id IN (
        SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own reactions"
  ON public.post_reactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_community_posts_community_id ON public.community_posts(community_id);
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON public.post_reactions(user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-posts', 'community-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community-posts bucket
CREATE POLICY "Community members can upload post images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'community-posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Post images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'community-posts');

CREATE POLICY "Users can update their own post images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'community-posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own post images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'community-posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );