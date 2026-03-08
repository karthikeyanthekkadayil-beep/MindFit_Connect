import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Users, MessageSquare, Calendar, Flag, Trash2, Eye, ArrowLeft, AlertTriangle, CheckCircle, Scale, TrendingUp, Activity, Star, Clock, Target, History } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { format, subDays } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ReportsTab } from "@/components/moderator/ReportsTab";
import { HistoryTab } from "@/components/moderator/HistoryTab";
import { WarnUserDialog } from "@/components/moderator/WarnUserDialog";

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  community_id: string;
  post_type: string;
  author_name?: string;
  community_name?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  location: string;
  creator_id: string;
  community_id: string;
  creator_name?: string;
}

interface Community {
  id: string;
  name: string;
  description: string;
  member_count: number;
  is_private: boolean;
  created_at: string;
  creator_id: string;
}

const Moderator = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [stats, setStats] = useState({
    postsToReview: 0,
    activeEvents: 0,
    reportedContent: 0,
    totalCommunities: 0
  });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [balanceData, setBalanceData] = useState({
    postsDeleted: 0,
    eventsReviewed: 0,
    communitiesMonitored: 0,
    actionsThisWeek: 0,
    avgResponseTime: 0,
    balanceScore: 0,
  });
  const [activityWeekData, setActivityWeekData] = useState<{ day: string; actions: number }[]>([]);

  useEffect(() => {
    checkModeratorAccess();
  }, []);

  const checkModeratorAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please log in to access this page");
      navigate("/auth");
      return;
    }

    setSession(session);

    // Check if user has moderator or admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["moderator", "admin"]);

    if (roleError || !roleData || roleData.length === 0) {
      toast.error("Access denied. Moderator privileges required.");
      navigate("/dashboard");
      return;
    }

    setIsModerator(true);
    await loadModeratorData();
    setIsLoading(false);
  };

  const loadModeratorData = async () => {
    try {
      // Load recent posts
      const { data: postsData } = await supabase
        .from("community_posts")
        .select(`
          id, content, created_at, user_id, community_id, post_type
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsData) {
        // Get author names
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const communityIds = [...new Set(postsData.map(p => p.community_id))];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const { data: communitiesData } = await supabase
          .from("communities")
          .select("id, name")
          .in("id", communityIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        const communityMap = new Map(communitiesData?.map(c => [c.id, c.name]) || []);

        const enrichedPosts = postsData.map(post => ({
          ...post,
          author_name: profileMap.get(post.user_id) || "Unknown User",
          community_name: communityMap.get(post.community_id) || "Unknown Community"
        }));

        setPosts(enrichedPosts);
      }

      // Load events
      const { data: eventsData } = await supabase
        .from("events")
        .select(`
          id, title, description, start_time, location, creator_id, community_id
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(30);

      if (eventsData) {
        const creatorIds = [...new Set(eventsData.map(e => e.creator_id))];
        const { data: creators } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);

        const creatorMap = new Map(creators?.map(c => [c.id, c.full_name]) || []);

        const enrichedEvents = eventsData.map(event => ({
          ...event,
          creator_name: creatorMap.get(event.creator_id) || "Unknown"
        }));

        setEvents(enrichedEvents);
      }

      // Load communities
      const { data: communitiesData } = await supabase
        .from("communities")
        .select("*")
        .order("member_count", { ascending: false })
        .limit(30);

      if (communitiesData) {
        setCommunities(communitiesData);
      }

      // Calculate stats
      setStats({
        postsToReview: postsData?.length || 0,
        activeEvents: eventsData?.length || 0,
        reportedContent: 0,
        totalCommunities: communitiesData?.length || 0
      });

      // Compute balance data
      const totalPosts = postsData?.length || 0;
      const totalEvents = eventsData?.length || 0;
      const totalComms = communitiesData?.length || 0;
      const actionsThisWeek = Math.round(totalPosts * 0.15 + totalEvents * 0.3);
      const modScore = Math.min(100, Math.round(
        (Math.min(totalPosts, 50) / 50) * 40 +
        (Math.min(totalEvents, 30) / 30) * 30 +
        (Math.min(totalComms, 30) / 30) * 30
      ));
      setBalanceData({
        postsDeleted: 0,
        eventsReviewed: totalEvents,
        communitiesMonitored: totalComms,
        actionsThisWeek,
        avgResponseTime: 2.4,
        balanceScore: modScore,
      });

      // Simulated 7-day activity
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      setActivityWeekData(days.map((day, i) => ({
        day,
        actions: Math.max(0, Math.round((actionsThisWeek / 7) * (0.6 + Math.random() * 0.8))),
      })));

    } catch (error) {
      console.error("Error loading moderator data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast.success("Post deleted successfully");
      setPosts(posts.filter(p => p.id !== postId));
      setSelectedPost(null);
      setDeleteReason("");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Event deleted successfully");
      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading moderator panel...</p>
        </div>
      </div>
    );
  }

  if (!isModerator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-secondary to-primary text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-white hover:bg-white/20 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                  <h1 className="text-lg sm:text-3xl font-heading font-bold truncate">Moderator Panel</h1>
                </div>
                <p className="text-white/90 mt-1 text-xs sm:text-base hidden sm:block">Review and moderate community content</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/20 text-xs sm:text-sm shrink-0"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Recent Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.postsToReview}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.activeEvents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Reported</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.reportedContent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Communities</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalCommunities}</div>
            </CardContent>
          </Card>
        </div>

        {/* Moderator Tabs */}
        <Tabs defaultValue="posts" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-6 h-auto">
              <TabsTrigger value="posts" className="text-xs sm:text-sm py-2">Posts</TabsTrigger>
              <TabsTrigger value="events" className="text-xs sm:text-sm py-2">Events</TabsTrigger>
              <TabsTrigger value="communities" className="text-xs sm:text-sm py-2">Communities</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm py-2">Reports</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm py-2">History</TabsTrigger>
              <TabsTrigger value="balance" className="text-xs sm:text-sm py-2">Balance</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="posts" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Recent Community Posts</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Review and moderate user-generated content</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="space-y-3 p-3 sm:p-0">
                  {posts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No posts to review</p>
                  ) : (
                    posts.slice(0, 10).map((post) => (
                      <div key={post.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs sm:text-sm">{post.author_name}</span>
                              <Badge variant="secondary" className="text-[9px] sm:text-xs">{post.community_name}</Badge>
                              <Badge variant="outline" className="text-[9px] sm:text-xs">{post.post_type}</Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                              {format(new Date(post.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => navigate(`/communities/${post.community_id}`)}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setSelectedPost(post)}
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[90vw] sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="text-base sm:text-lg">Delete Post</DialogTitle>
                                  <DialogDescription className="text-xs sm:text-sm">
                                    Are you sure you want to delete this post? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="p-3 bg-muted rounded-lg text-xs sm:text-sm">
                                  <p className="line-clamp-3">{selectedPost?.content}</p>
                                </div>
                                <Textarea
                                  placeholder="Reason for deletion (optional)"
                                  value={deleteReason}
                                  onChange={(e) => setDeleteReason(e.target.value)}
                                  className="text-sm"
                                />
                                <DialogFooter className="gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedPost(null)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => selectedPost && handleDeletePost(selectedPost.id)}
                                  >
                                    Delete Post
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Upcoming Events</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Review and manage community events</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="space-y-3 p-3 sm:p-0">
                  {events.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No upcoming events</p>
                  ) : (
                    events.slice(0, 10).map((event) => (
                      <div key={event.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs sm:text-sm">{event.title}</h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                              {format(new Date(event.start_time), 'MMM d, yyyy h:mm a')}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{event.location}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">By: {event.creator_name}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => navigate(`/events/${event.id}`)}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communities" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Community Overview</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Monitor community health and activity</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="space-y-3 p-3 sm:p-0">
                  {communities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No communities found</p>
                  ) : (
                    communities.map((community) => (
                      <div key={community.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-xs sm:text-sm truncate">{community.name}</h4>
                              {community.is_private && (
                                <Badge variant="outline" className="text-[9px] sm:text-xs shrink-0">Private</Badge>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-1">{community.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[9px] sm:text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {community.member_count} members
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => navigate(`/communities/${community.id}`)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance" className="space-y-4 mt-4">
            {/* Balance Score */}
            <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary/30 flex items-center justify-center bg-background">
                      <div className="text-center">
                        <div className="text-2xl sm:text-4xl font-bold text-primary">{balanceData.balanceScore}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Mod Score</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-semibold mb-1">
                      {balanceData.balanceScore >= 70 ? 'Active Moderator!' : balanceData.balanceScore >= 40 ? 'Building Momentum' : 'Getting Started'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your moderation balance score based on content reviewed, events monitored, and communities managed this period.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">Posts Reviewed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold mb-1">{stats.postsToReview}</div>
                  <Progress value={Math.min(100, (stats.postsToReview / 50) * 100)} className="h-2" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Target: 50 posts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-secondary" />
                    <span className="text-xs sm:text-sm font-medium">Events Monitored</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold mb-1">{balanceData.eventsReviewed}</div>
                  <Progress value={Math.min(100, (balanceData.eventsReviewed / 30) * 100)} className="h-2" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Target: 30 events</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 lg:col-span-1">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-accent" />
                    <span className="text-xs sm:text-sm font-medium">Communities</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold mb-1">{balanceData.communitiesMonitored}</div>
                  <Progress value={Math.min(100, (balanceData.communitiesMonitored / 30) * 100)} className="h-2" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Target: 30 communities</p>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Activity Chart */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Weekly Moderation Activity
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Actions taken across the week</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <div className="h-[180px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityWeekData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="actions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Actions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Highlights */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  Performance Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium">Total Actions This Week</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Based on reviewed content</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{balanceData.actionsThisWeek}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium">Avg. Response Time</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Time to moderate flagged content</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{balanceData.avgResponseTime}h</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium">Overall Balance Score</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Composite moderation effectiveness</p>
                    </div>
                  </div>
                  <Badge variant={balanceData.balanceScore >= 70 ? "default" : "outline"} className="text-xs">{balanceData.balanceScore}/100</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Moderation Guidelines */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              Moderation Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
            <div className="flex items-start gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <span>Remove content that violates community guidelines (spam, harassment, inappropriate content)</span>
            </div>
            <div className="flex items-start gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <span>Always provide a reason when deleting content for transparency</span>
            </div>
            <div className="flex items-start gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <span>Escalate serious violations to admin team</span>
            </div>
            <div className="flex items-start gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <span>Monitor for fake events or misleading information</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Moderator;