import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Clock, AlertTriangle, TrendingUp, Activity, ShieldAlert } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, differenceInHours } from "date-fns";

interface AnalyticsTabProps {
  moderatorId: string;
}

export const AnalyticsTab = ({ moderatorId }: AnalyticsTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activityData, setActivityData] = useState<{ date: string; reports: number; warnings: number }[]>([]);
  const [platformHealth, setPlatformHealth] = useState({
    totalUsers: 0, totalPosts: 0, totalEvents: 0, totalCommunities: 0,
    pendingReports: 0, resolvedToday: 0,
  });
  const [topReported, setTopReported] = useState<{ user_id: string; name: string; count: number; warnings: number }[]>([]);
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null);
  const [reportsByType, setReportsByType] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      await Promise.all([
        loadActivityChart(),
        loadPlatformHealth(),
        loadTopReported(),
        loadResponseTime(),
        loadReportsByType(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityChart = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [{ data: reports }, { data: warnings }] = await Promise.all([
      supabase.from("content_reports").select("created_at, status, reviewed_at").gte("created_at", thirtyDaysAgo),
      supabase.from("user_warnings").select("created_at").gte("created_at", thirtyDaysAgo),
    ]);

    const dayMap = new Map<string, { reports: number; warnings: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      dayMap.set(d, { reports: 0, warnings: 0 });
    }

    reports?.forEach(r => {
      const d = format(new Date(r.created_at), "MMM d");
      const entry = dayMap.get(d);
      if (entry) entry.reports++;
    });

    warnings?.forEach(w => {
      const d = format(new Date(w.created_at), "MMM d");
      const entry = dayMap.get(d);
      if (entry) entry.warnings++;
    });

    setActivityData(Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })));
  };

  const loadPlatformHealth = async () => {
    const today = startOfDay(new Date()).toISOString();

    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalEvents },
      { count: totalCommunities },
      { count: pendingReports },
      { count: resolvedToday },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("community_posts").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("communities").select("*", { count: "exact", head: true }),
      supabase.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("content_reports").select("*", { count: "exact", head: true }).neq("status", "pending").gte("reviewed_at", today),
    ]);

    setPlatformHealth({
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      totalEvents: totalEvents || 0,
      totalCommunities: totalCommunities || 0,
      pendingReports: pendingReports || 0,
      resolvedToday: resolvedToday || 0,
    });
  };

  const loadTopReported = async () => {
    const { data: reports } = await supabase.from("content_reports").select("content_type, content_id");
    if (!reports || reports.length === 0) { setTopReported([]); return; }

    // Get post user_ids for reported posts
    const postIds = reports.filter(r => r.content_type === "post").map(r => r.content_id);
    const userReportCount = new Map<string, number>();

    if (postIds.length > 0) {
      const { data: posts } = await supabase.from("community_posts").select("id, user_id").in("id", postIds);
      posts?.forEach(p => {
        userReportCount.set(p.user_id, (userReportCount.get(p.user_id) || 0) + 1);
      });
    }

    // Sort by count, take top 5
    const sorted = Array.from(userReportCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sorted.length === 0) { setTopReported([]); return; }

    const userIds = sorted.map(([id]) => id);
    const [{ data: profiles }, { data: warnings }] = await Promise.all([
      supabase.rpc("get_public_profiles_info", { profile_ids: userIds }),
      supabase.from("user_warnings").select("user_id").in("user_id", userIds),
    ]);

    const nameMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
    const warnCount = new Map<string, number>();
    warnings?.forEach(w => warnCount.set(w.user_id, (warnCount.get(w.user_id) || 0) + 1));

    setTopReported(sorted.map(([id, count]) => ({
      user_id: id,
      name: nameMap.get(id) || "Unknown",
      count,
      warnings: warnCount.get(id) || 0,
    })));
  };

  const loadResponseTime = async () => {
    const { data } = await supabase.from("content_reports")
      .select("created_at, reviewed_at")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const totalHours = data.reduce((sum, r) => {
        return sum + differenceInHours(new Date(r.reviewed_at!), new Date(r.created_at));
      }, 0);
      setAvgResponseTime(Math.round((totalHours / data.length) * 10) / 10);
    }
  };

  const loadReportsByType = async () => {
    const { data } = await supabase.from("content_reports").select("content_type");
    if (!data) return;
    const counts = new Map<string, number>();
    data.forEach(r => counts.set(r.content_type, (counts.get(r.content_type) || 0) + 1));
    setReportsByType(Array.from(counts.entries()).map(([name, value]) => ({ name, value })));
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--destructive))"];

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Platform Health Metrics */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Users", value: platformHealth.totalUsers, icon: <Users className="h-4 w-4" /> },
              { label: "Posts", value: platformHealth.totalPosts, icon: <BarChart3 className="h-4 w-4" /> },
              { label: "Events", value: platformHealth.totalEvents, icon: <TrendingUp className="h-4 w-4" /> },
              { label: "Groups", value: platformHealth.totalCommunities, icon: <Users className="h-4 w-4" /> },
              { label: "Pending", value: platformHealth.pendingReports, icon: <AlertTriangle className="h-4 w-4" /> },
              { label: "Resolved Today", value: platformHealth.resolvedToday, icon: <ShieldAlert className="h-4 w-4" /> },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl border bg-card text-center">
                <div className="flex justify-center text-muted-foreground mb-1">{m.icon}</div>
                <div className="text-lg font-bold">{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Time */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Avg. Response Time</p>
              <p className="text-2xl font-bold">
                {avgResponseTime !== null ? `${avgResponseTime}h` : "N/A"}
              </p>
              <p className="text-[11px] text-muted-foreground">Based on last 50 resolved reports</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Activity Chart (30 days) */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Moderation Activity (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData.slice(-14)} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="reports" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Reports" />
                <Line type="monotone" dataKey="warnings" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Warnings" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Reports by Type */}
      {reportsByType.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Reports by Content Type</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="h-[120px] w-[120px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                      {reportsByType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {reportsByType.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs capitalize">{r.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{r.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Reported Users */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Top Reported Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {topReported.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No reported users 🎉</p>
          ) : (
            <div className="space-y-2">
              {topReported.map((user, i) => (
                <div key={user.user_id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {user.count} reports · {user.warnings} warnings
                      </p>
                    </div>
                  </div>
                  <Badge variant={user.count >= 3 ? "destructive" : "secondary"} className="text-[10px]">
                    {user.count} reports
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
