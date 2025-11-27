import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, ThumbsUp, Trophy, Zap, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CommunityFeedProps {
  communityId: string;
}

const reactionIcons = {
  like: ThumbsUp,
  celebrate: Trophy,
  support: Heart,
  love: Heart,
  strong: Zap,
};

export const CommunityFeed = ({ communityId }: CommunityFeedProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["community-posts", communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      return data?.map((post) => ({
        ...post,
        profile: profiles?.find((p) => p.id === post.user_id),
      }));
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["post-comments", communityId],
    queryFn: async () => {
      const postIds = posts?.map((p) => p.id) || [];
      if (postIds.length === 0) return [];

      const { data, error } = await supabase
        .from("post_comments")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((c) => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      return data?.map((comment) => ({
        ...comment,
        profile: profiles?.find((p) => p.id === comment.user_id),
      }));
    },
    enabled: !!posts && posts.length > 0,
  });

  const { data: reactions } = useQuery({
    queryKey: ["post-reactions", communityId],
    queryFn: async () => {
      const postIds = posts?.map((p) => p.id) || [];
      if (postIds.length === 0) return [];

      const { data, error } = await supabase
        .from("post_reactions")
        .select("*")
        .in("post_id", postIds);

      if (error) throw error;
      return data;
    },
    enabled: !!posts && posts.length > 0,
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const existingReaction = reactions?.find(
        (r) => r.post_id === postId && r.user_id === currentUserId && r.reaction_type === reactionType
      );

      if (existingReaction) {
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("id", existingReaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_reactions")
          .insert({
            post_id: postId,
            user_id: currentUserId,
            reaction_type: reactionType,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-reactions", communityId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", communityId] });
      setCommentInputs((prev) => ({ ...prev, [variables.postId]: "" }));
      toast({ title: "Comment added" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts", communityId] });
      toast({ title: "Post deleted" });
    },
  });

  const getPostReactions = (postId: string) => {
    return reactions?.filter((r) => r.post_id === postId) || [];
  };

  const getPostComments = (postId: string) => {
    return comments?.filter((c) => c.post_id === postId) || [];
  };

  const hasUserReacted = (postId: string, reactionType: string) => {
    return reactions?.some(
      (r) => r.post_id === postId && r.user_id === currentUserId && r.reaction_type === reactionType
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading feed...</div>;
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No posts yet. Be the first to share something!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const postReactions = getPostReactions(post.id);
        const postComments = getPostComments(post.id);
        const reactionCounts = postReactions.reduce((acc, r) => {
          acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={post.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {post.profile?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{post.profile?.full_name || "Unknown"}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      <Badge variant="outline" className="capitalize">
                        {post.post_type}
                      </Badge>
                    </div>
                  </div>
                </div>
                {currentUserId === post.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePostMutation.mutate(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{post.content}</p>

              {post.image_urls && post.image_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.image_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Post image ${idx + 1}`}
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t">
                {Object.entries(reactionIcons).map(([type, Icon]) => (
                  <Button
                    key={type}
                    variant={hasUserReacted(post.id, type) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleReactionMutation.mutate({ postId: post.id, reactionType: type })}
                    className="gap-1"
                  >
                    <Icon className="h-4 w-4" />
                    {reactionCounts[type] || 0}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" className="gap-1 ml-auto">
                  <MessageCircle className="h-4 w-4" />
                  {postComments.length}
                </Button>
              </div>

              {postComments.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  {postComments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profile?.avatar_url || ""} />
                        <AvatarFallback>
                          {comment.profile?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="font-semibold text-sm">
                            {comment.profile?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentInputs[post.id] || ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    addCommentMutation.mutate({
                      postId: post.id,
                      content: commentInputs[post.id] || "",
                    })
                  }
                  disabled={!commentInputs[post.id]?.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
