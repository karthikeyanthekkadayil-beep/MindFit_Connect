import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/BottomNav";
import { Activity, Brain, Apple, Users, TrendingUp, Target } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

const Progress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fitnessData, setFitnessData] = useState<any[]>([]);
  const [nutritionData, setNutritionData] = useState<any[]>([]);
  const [meditationData, setMeditationData] = useState<any[]>([]);
  const [communityStats, setCommunityStats] = useState<any>({});
  const [weeklyStats, setWeeklyStats] = useState<any>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchAnalytics(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchAnalytics = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch last 7 days of activities
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'yyyy-MM-dd');
      });

      // Fitness activities
      const { data: activities } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', last7Days[0])
        .order('scheduled_date', { ascending: true });

      // Meditation sessions
      const { data: meditation } = await supabase
        .from('user_meditation_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('session_date', last7Days[0])
        .order('session_date', { ascending: true });

      // Nutrition adherence
      const { data: meals } = await supabase
        .from('user_meal_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('planned_date', last7Days[0])
        .order('planned_date', { ascending: true });

      // Community engagement
      const { data: communities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      const { data: posts } = await supabase
        .from('community_posts')
        .select('id')
        .eq('user_id', userId);

      const { data: comments } = await supabase
        .from('post_comments')
        .select('id')
        .eq('user_id', userId);

      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('id')
        .eq('user_id', userId);

      // Process fitness data
      const fitnessChart = last7Days.map(date => {
        const dayActivities = activities?.filter(a => a.scheduled_date === date) || [];
        const completed = dayActivities.filter(a => a.completed).length;
        const total = dayActivities.length;
        return {
          date: format(new Date(date), 'EEE'),
          completed,
          total,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      });

      // Process meditation data
      const meditationChart = last7Days.map(date => {
        const daySessions = meditation?.filter(m => 
          format(new Date(m.session_date), 'yyyy-MM-dd') === date
        ) || [];
        const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
        return {
          date: format(new Date(date), 'EEE'),
          minutes: totalMinutes,
          sessions: daySessions.length
        };
      });

      // Process nutrition data
      const nutritionChart = last7Days.map(date => {
        const dayMeals = meals?.filter(m => m.planned_date === date) || [];
        const completed = dayMeals.filter(m => m.completed).length;
        const total = dayMeals.length;
        return {
          date: format(new Date(date), 'EEE'),
          completed,
          planned: total,
          adherence: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      });

      // Weekly summary stats
      const totalActivitiesCompleted = activities?.filter(a => a.completed).length || 0;
      const totalActivities = activities?.length || 0;
      const totalMeditationMinutes = meditation?.reduce((sum, m) => sum + m.duration_minutes, 0) || 0;
      const totalMealsCompleted = meals?.filter(m => m.completed).length || 0;
      const totalMealsPlanned = meals?.length || 0;

      setFitnessData(fitnessChart);
      setMeditationData(meditationChart);
      setNutritionData(nutritionChart);
      setCommunityStats({
        communities: communities?.length || 0,
        posts: posts?.length || 0,
        comments: comments?.length || 0,
        reactions: reactions?.length || 0
      });
      setWeeklyStats({
        fitnessCompletion: totalActivities > 0 ? Math.round((totalActivitiesCompleted / totalActivities) * 100) : 0,
        meditationMinutes: totalMeditationMinutes,
        nutritionAdherence: totalMealsPlanned > 0 ? Math.round((totalMealsCompleted / totalMealsPlanned) * 100) : 0,
        communityEngagement: (posts?.length || 0) + (comments?.length || 0) + (reactions?.length || 0)
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-hero text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Progress Analytics</h1>
            <p className="text-white/90 mt-1">Track your wellness journey</p>
          </div>
          <Button 
            onClick={() => navigate('/goals')} 
            className="bg-white text-primary hover:bg-white/90"
          >
            <Target className="h-5 w-5 mr-2" />
            My Goals
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Weekly Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fitness Completion</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.fitnessCompletion}%</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meditation Time</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.meditationMinutes} min</div>
              <p className="text-xs text-muted-foreground">Total this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nutrition Adherence</CardTitle>
              <Apple className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.nutritionAdherence}%</div>
              <p className="text-xs text-muted-foreground">Meal plan followed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community Activity</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.communityEngagement}</div>
              <p className="text-xs text-muted-foreground">Total interactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Charts */}
        <Tabs defaultValue="fitness" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fitness">Fitness</TabsTrigger>
            <TabsTrigger value="meditation">Meditation</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>

          <TabsContent value="fitness" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fitness Activity Trends</CardTitle>
                <CardDescription>Daily activity completion over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  completed: { label: "Completed", color: "hsl(var(--primary))" },
                  total: { label: "Total", color: "hsl(var(--muted))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fitnessData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                      <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
                <CardDescription>Percentage of completed activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  completionRate: { label: "Completion Rate", color: "hsl(var(--primary))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fitnessData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="completionRate" stroke="hsl(var(--primary))" strokeWidth={2} name="Completion %" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meditation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meditation Consistency</CardTitle>
                <CardDescription>Daily meditation minutes over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  minutes: { label: "Minutes", color: "hsl(var(--primary))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={meditationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" name="Minutes" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Frequency</CardTitle>
                <CardDescription>Number of meditation sessions per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  sessions: { label: "Sessions", color: "hsl(var(--secondary))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={meditationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="sessions" stroke="hsl(var(--secondary))" strokeWidth={2} name="Sessions" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nutrition Adherence</CardTitle>
                <CardDescription>Meal plan completion over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  completed: { label: "Completed", color: "hsl(var(--primary))" },
                  planned: { label: "Planned", color: "hsl(var(--muted))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nutritionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                      <Bar dataKey="planned" fill="hsl(var(--muted))" name="Planned" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adherence Percentage</CardTitle>
                <CardDescription>Daily meal plan adherence rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  adherence: { label: "Adherence", color: "hsl(var(--primary))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={nutritionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="adherence" stroke="hsl(var(--primary))" strokeWidth={2} name="Adherence %" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Community Engagement</CardTitle>
                <CardDescription>Your social activity breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  posts: { label: "Posts", color: "hsl(var(--primary))" },
                  comments: { label: "Comments", color: "hsl(var(--secondary))" },
                  reactions: { label: "Reactions", color: "hsl(var(--accent))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Posts', value: communityStats.posts },
                          { name: 'Comments', value: communityStats.comments },
                          { name: 'Reactions', value: communityStats.reactions }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Communities Joined</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">{communityStats.communities}</div>
                  <p className="text-sm text-muted-foreground mt-2">Active communities</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Interactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">{weeklyStats.communityEngagement}</div>
                  <p className="text-sm text-muted-foreground mt-2">Posts, comments, reactions</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Progress;
