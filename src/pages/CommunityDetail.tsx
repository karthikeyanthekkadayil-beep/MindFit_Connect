import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, UserPlus, UserMinus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
        .select("*, creator:profiles!communities_creator_id_fkey(full_name, avatar_url)")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ["community-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, profile:profiles(full_name, avatar_url, bio)")
        .eq("community_id", id!)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data;
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
            <Button
              variant="outline"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
              className="gap-2"
            >
              <UserMinus className="h-4 w-4" />
              Leave
            </Button>
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

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

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
                          {member.profile?.bio || "No bio available"}
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
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No events yet</h3>
              <p className="text-muted-foreground">
                Community events will appear here
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
