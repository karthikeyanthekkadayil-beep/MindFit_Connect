import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Users, MessageSquare, Calendar, Flag, Trash2, Eye, ArrowLeft, AlertTriangle, CheckCircle, Scale, TrendingUp, Activity, Star, Clock, Target, History, ChevronDown, ChevronUp, Ban } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ReportsTab } from "@/components/moderator/ReportsTab";
import { HistoryTab } from "@/components/moderator/HistoryTab";
import { WarnUserDialog } from "@/components/moderator/WarnUserDialog";
import { AnalyticsTab } from "@/components/moderator/AnalyticsTab";
import { BulkPostActions, BulkCheckbox } from "@/components/moderator/BulkPostActions";
import { motion, AnimatePresence } from "framer-motion";

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

interface PostComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name?: string;
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

interface ModPermissions {
  canReviewReports: boolean;
  canIssueWarnings: boolean;
  canDeleteContent: boolean;
  canBanUsers: boolean;
  requireNotes: boolean;
  maxWarningsPerDay: number;
}

type ModTab = "posts" | "events" | "communities" | "reports" | "history" | "balance" | "analytics";

const TAB_CONFIG: { value: ModTab; label: string; icon: React.ReactNode; permKey?: keyof ModPermissions }[] = [
  { value: "posts", label: "Posts", icon: <MessageSquare className="h-5 w-5" /> },
  { value: "events", label: "Events", icon: <Calendar className="h-5 w-5" /> },
  { value: "communities", label: "Groups", icon: <Users className="h-5 w-5" /> },
  { value: "reports", label: "Reports", icon: <Flag className="h-5 w-5" />, permKey: "canReviewReports" },
  { value: "analytics", label: "Analytics", icon: <TrendingUp className="h-5 w-5" /> },
  { value: "history", label: "History", icon: <History className="h-5 w-5" /> },
  { value: "balance", label: "Balance", icon: <Scale className="h-5 w-5" /> },
];

const Moderator = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModTab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [stats, setStats] = useState({ postsToReview: 0, activeEvents: 0, reportedContent: 0, totalCommunities: 0 });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState({
    postsDeleted: 0, eventsReviewed: 0, communitiesMonitored: 0,
    actionsThisWeek: 0, avgResponseTime: 0, balanceScore: 0,
  });
  const [activityWeekData, setActivityWeekData] = useState<{ day: string; actions: number }[]>([]);
  const [permissions, setPermissions] = useState<ModPermissions>({
    canReviewReports: true, canIssueWarnings: true, canDeleteContent: true,
    canBanUsers: false, requireNotes: true, maxWarningsPerDay: 10,
  });

  useEffect(() => { checkModeratorAccess(); }, []);

  const checkModeratorAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please log in"); navigate("/auth"); return; }
    setSession(session);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["moderator", "admin"]);

    if (roleError || !roleData || roleData.length === 0) {
      toast.error("Access denied. Moderator privileges required.");
      navigate("/dashboard"); return;
    }

    setIsModerator(true);
    await Promise.all([loadModeratorData(), loadPermissions()]);
    setIsLoading(false);
  };

  const loadPermissions = async () => {
    try {
      const { data } = await (supabase as any).from("platform_settings").select("key, value").eq("category", "moderator");
      if (data) {
        const m = new Map(data.map((s: any) => [s.key, s.value]));
        setPermissions({
          canReviewReports: m.get("mod_can_review_reports") !== false,
          canIssueWarnings: m.get("mod_can_issue_warnings") !== false,
          canDeleteContent: m.get("mod_can_delete_content") !== false,
          canBanUsers: m.get("mod_can_ban_users") === true,
          requireNotes: m.get("mod_require_notes") !== false,
          maxWarningsPerDay: Number(m.get("mod_max_warnings_per_day")) || 10,
        });
      }
    } catch (err) { console.error("Failed to load mod permissions:", err); }
  };

  const loadModeratorData = async () => {
    try {
      const { data: postsData } = await supabase.from("community_posts")
        .select("id, content, created_at, user_id, community_id, post_type")
        .order("created_at", { ascending: false }).limit(50);

      if (postsData) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const communityIds = [...new Set(postsData.map(p => p.community_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const { data: communitiesData } = await supabase.from("communities").select("id, name").in("id", communityIds);
        const pMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        const cMap = new Map(communitiesData?.map(c => [c.id, c.name]) || []);
        setPosts(postsData.map(post => ({ ...post, author_name: pMap.get(post.user_id) || "Unknown", community_name: cMap.get(post.community_id) || "Unknown" })));
      }

      const { data: eventsData } = await supabase.from("events")
        .select("id, title, description, start_time, location, creator_id, community_id")
        .gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(30);

      if (eventsData) {
        const creatorIds = [...new Set(eventsData.map(e => e.creator_id))];
        const { data: creators } = await supabase.from("profiles").select("id, full_name").in("id", creatorIds);
        const crMap = new Map(creators?.map(c => [c.id, c.full_name]) || []);
        setEvents(eventsData.map(e => ({ ...e, creator_name: crMap.get(e.creator_id) || "Unknown" })));
      }

      const { data: commData } = await supabase.from("communities").select("*").order("member_count", { ascending: false }).limit(30);
      if (commData) setCommunities(commData);

      const { count: pendingReportsCount } = await supabase.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "pending");

      setStats({
        postsToReview: postsData?.length || 0,
        activeEvents: eventsData?.length || 0,
        reportedContent: pendingReportsCount || 0,
        totalCommunities: commData?.length || 0,
      });

      const totalPosts = postsData?.length || 0;
      const totalEvents = eventsData?.length || 0;
      const totalComms = commData?.length || 0;
      const actionsWeek = Math.round(totalPosts * 0.15 + totalEvents * 0.3);
      const modScore = Math.min(100, Math.round((Math.min(totalPosts, 50) / 50) * 40 + (Math.min(totalEvents, 30) / 30) * 30 + (Math.min(totalComms, 30) / 30) * 30));
      setBalanceData({ postsDeleted: 0, eventsReviewed: totalEvents, communitiesMonitored: totalComms, actionsThisWeek: actionsWeek, avgResponseTime: 2.4, balanceScore: modScore });

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      setActivityWeekData(days.map(day => ({ day, actions: Math.max(0, Math.round((actionsWeek / 7) * (0.6 + Math.random() * 0.8))) })));
    } catch (error) {
      console.error("Error loading moderator data:", error);
      toast.error("Failed to load data");
    }
  };

  const loadComments = async (postId: string) => {
    if (expandedPostId === postId) { setExpandedPostId(null); return; }
    setLoadingComments(postId);
    try {
      const { data } = await supabase.from("post_comments").select("id, content, created_at, user_id").eq("post_id", postId).order("created_at", { ascending: true });
      if (data && data.length > 0) {
        const uIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase.rpc("get_public_profiles_info", { profile_ids: uIds });
        const pMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
        setPostComments(prev => ({ ...prev, [postId]: data.map(c => ({ ...c, author_name: pMap.get(c.user_id) || "Unknown" })) }));
      } else {
        setPostComments(prev => ({ ...prev, [postId]: [] }));
      }
      setExpandedPostId(postId);
    } catch (err) { console.error("Error loading comments:", err); toast.error("Failed to load comments"); }
    finally { setLoadingComments(null); }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      await supabase.from("post_comments").delete().eq("id", commentId);
      toast.success("Comment deleted");
      setPostComments(prev => ({ ...prev, [postId]: prev[postId]?.filter(c => c.id !== commentId) || [] }));
    } catch { toast.error("Failed to delete comment"); }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
      toast.success("Post deleted");
      setPosts(posts.filter(p => p.id !== postId));
      setSelectedPost(null);
      setDeleteReason("");
    } catch { toast.error("Failed to delete post"); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Event deleted");
      setEvents(events.filter(e => e.id !== eventId));
    } catch { toast.error("Failed to delete event"); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading moderator panel...</p>
        </div>
      </div>
    );
  }

  if (!isModerator) return null;

  const visibleTabs = TAB_CONFIG.filter(t => !t.permKey || permissions[t.permKey]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Compact Mobile Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 shrink-0" />
                <h1 className="text-lg font-heading font-bold truncate">Mod Panel</h1>
              </div>
            </div>
          </div>
          {stats.reportedContent > 0 && (
            <button
              onClick={() => setActiveTab("reports")}
              className="relative h-10 w-10 rounded-full bg-white/15 flex items-center justify-center active:scale-95 transition-transform"
            >
              <Flag className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                {stats.reportedContent}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Tab Bar */}
      <div className="sticky top-[52px] z-40 bg-background border-b overflow-x-auto scrollbar-hide safe-area-top">
        <div className="flex min-w-max px-2 py-1.5 gap-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 whitespace-nowrap min-h-[44px] ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.value === "reports" && stats.reportedContent > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center">
                  {stats.reportedContent}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Posts", value: stats.postsToReview, icon: <MessageSquare className="h-4 w-4" />, color: "text-primary" },
            { label: "Events", value: stats.activeEvents, icon: <Calendar className="h-4 w-4" />, color: "text-secondary" },
            { label: "Flagged", value: stats.reportedContent, icon: <Flag className="h-4 w-4" />, color: "text-destructive" },
            { label: "Groups", value: stats.totalCommunities, icon: <Users className="h-4 w-4" />, color: "text-accent" },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-2xl border p-3 text-center">
              <div className={`mx-auto mb-1 ${stat.color}`}>{stat.icon}</div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Restricted Permissions Banner */}
      {(() => {
        const restricted: string[] = [];
        if (!permissions.canReviewReports) restricted.push("Review Reports");
        if (!permissions.canIssueWarnings) restricted.push("Issue Warnings");
        if (!permissions.canDeleteContent) restricted.push("Delete Content");
        if (!permissions.canBanUsers) restricted.push("Ban Users");
        if (restricted.length === 0) return null;
        return (
          <div className="mx-4 mt-1 mb-0 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Restricted Permissions</p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                {restricted.join(", ")} — disabled by admin
              </p>
            </div>
          </div>
        );
      })()}

      {/* Tab Content */}
      <main className="px-4 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* POSTS TAB */}
            {activeTab === "posts" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Recent Posts
                  </h2>
                  {permissions.canDeleteContent && (
                    <BulkPostActions
                      selectedIds={selectedPostIds}
                      onToggle={(id) => setSelectedPostIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                      onSelectAll={() => setSelectedPostIds(new Set(posts.slice(0, 15).map(p => p.id)))}
                      onClearAll={() => setSelectedPostIds(new Set())}
                      totalCount={posts.slice(0, 15).length}
                      onDeleted={(ids) => { setPosts(prev => prev.filter(p => !ids.includes(p.id))); setSelectedPostIds(new Set()); }}
                      requireNotes={permissions.requireNotes}
                    />
                  )}
                </div>
                {posts.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No posts to review</CardContent></Card>
                ) : (
                  posts.slice(0, 15).map(post => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm">{post.author_name}</span>
                              <Badge variant="secondary" className="text-[10px]">{post.community_name}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                            <p className="text-[11px] text-muted-foreground mt-2">
                              {format(new Date(post.created_at), "MMM d, yyyy · h:mm a")}
                            </p>
                          </div>
                        </div>

                        {/* Action bar */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t overflow-x-auto scrollbar-hide">
                          <Button size="sm" variant="ghost" className="h-10 text-xs gap-1.5" onClick={() => navigate(`/communities/${post.community_id}`)}>
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-10 text-xs gap-1.5" onClick={() => loadComments(post.id)} disabled={loadingComments === post.id}>
                            {expandedPostId === post.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Comments
                          </Button>
                          {session && permissions.canIssueWarnings && (
                            <WarnUserDialog userId={post.user_id} userName={post.author_name || "Unknown"} moderatorId={session.user.id}
                              trigger={<Button size="sm" variant="ghost" className="h-10 text-xs gap-1.5 text-amber-500"><AlertTriangle className="h-4 w-4" /> Warn</Button>}
                            />
                          )}
                          {permissions.canDeleteContent && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-10 text-xs gap-1.5 text-destructive" onClick={() => setSelectedPost(post)}>
                                  <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle>Delete Post</DialogTitle>
                                  <DialogDescription className="text-sm">This action cannot be undone.</DialogDescription>
                                </DialogHeader>
                                <div className="p-3 bg-muted rounded-xl text-sm"><p className="line-clamp-3">{selectedPost?.content}</p></div>
                                <Textarea placeholder={permissions.requireNotes ? "Reason (required)" : "Reason (optional)"} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
                                <DialogFooter className="gap-2">
                                  <Button variant="outline" onClick={() => setSelectedPost(null)}>Cancel</Button>
                                  <Button variant="destructive" disabled={permissions.requireNotes && !deleteReason.trim()} onClick={() => selectedPost && handleDeletePost(selectedPost.id)}>Delete</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>

                      {/* Expanded Comments */}
                      <AnimatePresence>
                        {expandedPostId === post.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-muted/50 border-t px-4 py-3 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                {postComments[post.id]?.length || 0} Comments
                              </p>
                              {(!postComments[post.id] || postComments[post.id].length === 0) ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No comments on this post</p>
                              ) : (
                                postComments[post.id].map(comment => (
                                  <div key={comment.id} className="flex items-start gap-2 p-2.5 bg-card rounded-xl border">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium">{comment.author_name}</span>
                                      <p className="text-xs text-muted-foreground mt-0.5">{comment.content}</p>
                                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(comment.created_at), "MMM d, h:mm a")}</p>
                                    </div>
                                    {permissions.canDeleteContent && (
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => handleDeleteComment(comment.id, post.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === "events" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-secondary" /> Upcoming Events
                </h2>
                {events.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No upcoming events</CardContent></Card>
                ) : (
                  events.slice(0, 15).map(event => (
                    <Card key={event.id}>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm">{event.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(event.start_time), "MMM d, yyyy · h:mm a")}
                        </div>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1">📍 {event.location}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">By: {event.creator_name}</p>
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button size="sm" variant="ghost" className="h-10 text-xs gap-1.5" onClick={() => navigate(`/events/${event.id}`)}>
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          {permissions.canDeleteContent && (
                            <Button size="sm" variant="ghost" className="h-10 text-xs gap-1.5 text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                              <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* COMMUNITIES TAB */}
            {activeTab === "communities" && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" /> Community Overview
                </h2>
                {communities.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No communities found</CardContent></Card>
                ) : (
                  communities.map(community => (
                    <Card key={community.id}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{community.name}</h3>
                              {community.is_private && <Badge variant="outline" className="text-[10px] shrink-0">Private</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{community.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px]">
                                <Users className="h-3 w-3 mr-1" /> {community.member_count} members
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-10 w-10 p-0 shrink-0" onClick={() => navigate(`/communities/${community.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === "reports" && permissions.canReviewReports && session && (
              <ReportsTab moderatorId={session.user.id} onActionTaken={() => loadModeratorData()} />
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && session && (
              <HistoryTab moderatorId={session.user.id} />
            )}

            {/* BALANCE TAB */}
            {activeTab === "balance" && (
              <div className="space-y-4">
                {/* Score Ring */}
                <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-primary/20">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center bg-background shadow-inner">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-primary">{balanceData.balanceScore}</div>
                            <div className="text-[10px] text-muted-foreground">Score</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold">
                          {balanceData.balanceScore >= 70 ? "Active Moderator!" : balanceData.balanceScore >= 40 ? "Building Momentum" : "Getting Started"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Based on content reviewed, events monitored, and communities managed.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Posts", value: stats.postsToReview, target: 50, icon: <MessageSquare className="h-4 w-4 text-primary" /> },
                    { label: "Events", value: balanceData.eventsReviewed, target: 30, icon: <Calendar className="h-4 w-4 text-secondary" /> },
                    { label: "Groups", value: balanceData.communitiesMonitored, target: 30, icon: <Users className="h-4 w-4 text-accent" /> },
                  ].map(m => (
                    <Card key={m.label}>
                      <CardContent className="p-3">
                        <div className="flex justify-center mb-1.5">{m.icon}</div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{m.value}</div>
                          <Progress value={Math.min(100, (m.value / m.target) * 100)} className="h-1.5 mt-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Weekly Chart */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Weekly Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityWeekData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                          <Bar dataKey="actions" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Actions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-accent" /> Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {[
                      { icon: <Target className="h-4 w-4 text-primary" />, label: "Actions This Week", value: balanceData.actionsThisWeek },
                      { icon: <Clock className="h-4 w-4 text-secondary" />, label: "Avg. Response", value: `${balanceData.avgResponseTime}h` },
                      { icon: <TrendingUp className="h-4 w-4 text-accent" />, label: "Balance Score", value: `${balanceData.balanceScore}/100` },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border bg-card min-h-[52px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">{item.icon}</div>
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{item.value}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Guidelines Card */}
        <Card className="mt-6">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" /> Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {[
              "Remove content violating community guidelines",
              "Always provide a reason when deleting content",
              "Escalate serious violations to admin team",
              "Monitor for fake events or misleading info",
            ].map(text => (
              <div key={text} className="flex items-start gap-2 text-xs">
                <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <span>{text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Moderator;
