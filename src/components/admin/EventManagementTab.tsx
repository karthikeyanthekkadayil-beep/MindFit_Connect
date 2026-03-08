import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Trash2, Users, MapPin, Loader2, CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface EventItem {
  id: string;
  title: string;
  event_type: string;
  location: string | null;
  start_time: string;
  end_time: string;
  max_participants: number | null;
  current_participants: number | null;
  created_at: string;
  creator_id: string;
  creator_name?: string;
  community_name?: string;
  community_id: string;
}

export const EventManagementTab = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_type, location, start_time, end_time, max_participants, current_participants, created_at, creator_id, community_id")
      .order("start_time", { ascending: false });

    if (error) {
      toast.error("Failed to load events");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const creatorIds = [...new Set(data.map(e => e.creator_id))];
      const communityIds = [...new Set(data.map(e => e.community_id))];

      const [{ data: profiles }, { data: communities }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", creatorIds),
        supabase.from("communities").select("id, name").in("id", communityIds),
      ]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const communityMap = new Map(communities?.map(c => [c.id, c.name]) || []);

      setEvents(
        data.map(e => ({
          ...e,
          creator_name: profileMap.get(e.creator_id) || "Unknown",
          community_name: communityMap.get(e.community_id) || "Unknown",
        }))
      );
    } else {
      setEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await supabase.from("event_rsvps").delete().eq("event_id", id);
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      toast.success("Event deleted successfully");
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch {
      toast.error("Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  };

  const isUpcoming = (startTime: string) => new Date(startTime) > new Date();

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.event_type.toLowerCase().includes(search.toLowerCase()) ||
    (e.location || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.creator_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Event Management</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Review and manage all platform events ({events.length} total)
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, type, location, or creator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            {search ? "No events match your search." : "No events yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Title</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Community</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Location</TableHead>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Attendees</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">
                      <div className="flex items-center gap-1.5">
                        {event.title}
                        {isUpcoming(event.start_time) ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-secondary/20 text-secondary border-0">
                            Upcoming
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            Past
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell truncate max-w-[100px]">
                      {event.community_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {event.location ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[120px]">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {event.location}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs sm:text-sm">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {format(new Date(event.start_time), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs sm:text-sm">
                        <Users className="h-3 w-3" />
                        {event.current_participants || 0}
                        {event.max_participants && `/${event.max_participants}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === event.id}
                          >
                            {deletingId === event.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the event and all RSVPs. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(event.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
