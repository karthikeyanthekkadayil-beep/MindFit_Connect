import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Calendar, MapPin, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { EventsMap } from "@/components/EventsMap";
import { format } from "date-fns";

export default function Events() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", searchQuery, selectedType],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          community:communities(name, category),
          creator:profiles!events_creator_id_fkey(full_name, avatar_url),
          rsvp_count:event_rsvps(count)
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      if (selectedType !== "all") {
        query = query.eq("event_type", selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: myEvents } = useQuery({
    queryKey: ["my-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("event_rsvps")
        .select(`
          event:events(
            *,
            community:communities(name, category),
            creator:profiles!events_creator_id_fkey(full_name, avatar_url)
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "going");

      if (error) throw error;
      return data.map(item => item.event).filter(Boolean);
    },
  });

  const eventTypes = ["Workout", "Running", "Cycling", "Hiking", "Sports", "Yoga", "Social"];

  const EventCard = ({ event }: { event: any }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      {event.image_url && (
        <div className="h-40 overflow-hidden rounded-t-lg">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {event.description}
            </CardDescription>
          </div>
          <Badge variant="secondary">{event.event_type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
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
      </CardContent>
      <CardFooter>
        <Badge variant="outline">{event.community?.name}</Badge>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground">Discover and join fitness activities</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-events">My Events</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("all")}
                >
                  All
                </Button>
                {eventTypes.map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                >
                  Map
                </Button>
              </div>
            </div>

            {viewMode === "map" ? (
              <div className="h-[600px] rounded-lg overflow-hidden border">
                <EventsMap events={events || []} onEventClick={(eventId) => navigate(`/events/${eventId}`)} />
              </div>
            ) : (
              <>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading events...</div>
                ) : events && events.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {events.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No events found</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to create an event
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="my-events" className="space-y-4">
            {myEvents && myEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {myEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">
                  RSVP to events to see them here
                </p>
                <Button onClick={() => {
                  const discoverTab = document.querySelector('[value="discover"]') as HTMLElement;
                  discoverTab?.click();
                }}>
                  Discover Events
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateEventDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </div>
    </div>
  );
}
