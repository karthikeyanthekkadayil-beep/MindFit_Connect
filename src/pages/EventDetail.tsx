import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Users, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          community:communities(id, name, category),
          creator:profiles!events_creator_id_fkey(full_name, avatar_url)
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: attendees } = useQuery({
    queryKey: ["event-attendees", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("*, profile:profiles(full_name, avatar_url, bio)")
        .eq("event_id", id!)
        .eq("status", "going")
        .order("rsvp_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: userRsvp } = useQuery({
    queryKey: ["user-rsvp", id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;

      const { data, error } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", id!)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!currentUserId,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: "going" | "interested" | "not_going") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (userRsvp) {
        const { error } = await supabase
          .from("event_rsvps")
          .update({ status })
          .eq("id", userRsvp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_rsvps")
          .insert({ event_id: id!, user_id: user.id, status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-rsvp", id] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("RSVP updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update RSVP");
    },
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async () => {
      if (!userRsvp) return;

      const { error } = await supabase
        .from("event_rsvps")
        .delete()
        .eq("id", userRsvp.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-rsvp", id] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("RSVP cancelled");
    },
    onError: () => {
      toast.error("Failed to cancel RSVP");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const isEventFull = event.max_participants && event.current_participants >= event.max_participants;
  const userIsGoing = userRsvp?.status === "going";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative">
        {event.image_url && (
          <div className="h-64 overflow-hidden">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur"
          onClick={() => navigate("/events")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
              <Badge variant="secondary">{event.event_type}</Badge>
            </div>
            <p className="text-muted-foreground mb-4">{event.description}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-foreground">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span>{format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>
                  {format(new Date(event.start_time), "p")} - {format(new Date(event.end_time), "p")}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-3 text-foreground">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-foreground">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>
                  {event.current_participants || 0}
                  {event.max_participants && ` / ${event.max_participants}`} attending
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Avatar className="h-10 w-10">
                <AvatarImage src={event.creator?.avatar_url} />
                <AvatarFallback>{event.creator?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Hosted by {event.creator?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {event.community?.name} • {event.community?.category}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          {userIsGoing ? (
            <Button
              variant="outline"
              onClick={() => cancelRsvpMutation.mutate()}
              disabled={cancelRsvpMutation.isPending}
              className="gap-2"
            >
              <UserMinus className="h-4 w-4" />
              Cancel RSVP
            </Button>
          ) : (
            <Button
              onClick={() => rsvpMutation.mutate("going")}
              disabled={rsvpMutation.isPending || isEventFull}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {isEventFull ? "Event Full" : "I'm Going"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/communities/${event.community?.id}`)}
          >
            View Community
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendees ({attendees?.length || 0})</CardTitle>
            <CardDescription>People going to this event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendees && attendees.length > 0 ? (
                attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={attendee.profile?.avatar_url} />
                      <AvatarFallback>{attendee.profile?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{attendee.profile?.full_name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {attendee.profile?.bio || "No bio available"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No attendees yet. Be the first to RSVP!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
