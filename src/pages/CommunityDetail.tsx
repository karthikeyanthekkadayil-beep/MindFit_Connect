import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, UserPlus, UserMinus, Calendar, MapPin, Clock, Plus, BarChart3, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { MotionFadeIn } from "@/components/motion/MotionWrappers";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CreatePollDialog } from "@/components/CreatePollDialog";
import { CommunityPolls } from "@/components/CommunityPolls";

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      
      // Fetch creator profile using RPC
      const { data: creatorProfile } = await supabase
        .rpc("get_public_profile_info", { profile_id: data.creator_id });
      
      return {
        ...data,
        creator: creatorProfile?.[0] || null
      };
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ["community-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", id!)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      
      // Fetch member profiles using RPC
      const userIds = data?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: userIds });
      
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      
      return data?.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id)
      }));
    },
    enabled: !!id,
  });

  const { data: isMember } = useQuery({
    queryKey: ["is-member", id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return false;

      const { data, error } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", id!)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!id && !!currentUserId,
  });

  const { data: communityConversation } = useQuery({
    queryKey: ["community-conversation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("community_id", id!)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!id && !!isMember,
  });

  const { data: communityEvents } = useQuery({
    queryKey: ["community-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("community_id", id!)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      
      // Fetch creator profiles using RPC
      const creatorIds = [...new Set(data?.map(e => e.creator_id) || [])];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: creatorIds });
      
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      
      return data?.map(event => ({
        ...event,
        creator: profileMap.get(event.creator_id)
      }));
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: id!, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-member", id] });
      queryClient.invalidateQueries({ queryKey: ["community-members", id] });
      queryClient.invalidateQueries({ queryKey: ["community", id] });
      toast.success("Joined community successfully!");
    },
    onError: () => {
      toast.error("Failed to join community");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", id!)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-member", id] });
      queryClient.invalidateQueries({ queryKey: ["community-members", id] });
      queryClient.invalidateQueries({ queryKey: ["community", id] });
      toast.success("Left community successfully");
    },
    onError: () => {
      toast.error("Failed to leave community");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading community...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Community not found</p>
      </div>
    );
  }

  return (
    <AnimatedPage>
    <div className="min-h-screen bg-background pb-20">
      <div className="relative">
        {community.image_url && (
          <div className="h-48 overflow-hidden">
            <img
              src={community.image_url}
              alt={community.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur"
          onClick={() => navigate("/communities")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{community.name}</h1>
              <Badge variant="secondary">{community.category}</Badge>
            </div>
            <p className="text-muted-foreground mb-4">{community.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{community.member_count || 0} members</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={community.creator?.avatar_url} />
                  <AvatarFallback>{community.creator?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <span>Created by {community.creator?.full_name}</span>
              </div>
            </div>
          </div>
          {isMember ? (
            <div className="flex gap-2">
              {communityConversation && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/messages/${communityConversation.id}`)}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="gap-2"
              >
                <UserMinus className="h-4 w-4" />
                Leave
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Join
            </Button>
          )}
        </div>

        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="polls">Polls</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {isMember ? (
              <>
                <Button
                  onClick={() => setShowCreatePost(true)}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Post
                </Button>
                <CommunityFeed communityId={id!} />
                <CreatePostDialog
                  open={showCreatePost}
                  onOpenChange={setShowCreatePost}
                  communityId={id!}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Join this community to see and create posts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="polls" className="space-y-4">
            {isMember ? (
              <>
                <Button
                  onClick={() => setShowCreatePoll(true)}
                  className="w-full gap-2"
                  variant="secondary"
                >
                  <BarChart3 className="h-4 w-4" />
                  Create Poll
                </Button>
                <CommunityPolls communityId={id!} />
                <CreatePollDialog
                  open={showCreatePoll}
                  onOpenChange={setShowCreatePoll}
                  communityId={id!}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Join this community to see and create polls</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="grid gap-4">
              {members?.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback>{member.profile?.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{member.profile?.full_name}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          Member since {new Date(member.joined_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {communityEvents && communityEvents.length > 0 ? (
              <div className="grid gap-4">
                {communityEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription className="line-clamp-2 mb-3">
                            {event.description}
                          </CardDescription>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(event.start_time), "PPP")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(event.start_time), "p")}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="line-clamp-1">{event.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {event.current_participants || 0}
                                {event.max_participants && ` / ${event.max_participants}`} attending
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{event.event_type}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create an event for this community
                </p>
                {isMember && (
                  <Button onClick={() => navigate("/events")}>
                    Create Event
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AnimatedPage>
  );
}
