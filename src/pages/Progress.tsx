import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Activity, Brain, Apple, Users, TrendingUp, Target } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { StatsCardSkeleton, ChartSkeleton } from "@/components/skeletons";
import { MotionHeader, MotionFadeIn, MotionScaleIn, MotionList, MotionItem, MotionSection } from "@/components/motion/MotionWrappers";
import { InteractiveCard } from "@/components/ui/card";

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
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-hero text-white p-3 sm:p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="h-6 sm:h-8 bg-white/20 animate-pulse rounded w-32 mb-1" />
              <div className="h-3 sm:h-4 bg-white/20 animate-pulse rounded w-48" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton height="200px" />
          <ChartSkeleton height="200px" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MotionHeader className="bg-gradient-hero text-white p-3 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-heading font-bold">Progress</h1>
            <p className="text-white/90 mt-0.5 text-xs sm:text-base">Track your wellness journey</p>
          </div>
          <Button 
            onClick={() => navigate('/goals')} 
            className="bg-white text-primary hover:bg-white/90 h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
            size="sm"
          >
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Goals
          </Button>
        </div>
      </MotionHeader>

      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
        {/* Weekly Summary Cards */}
        <MotionList className="grid grid-cols-4 gap-2 sm:gap-4" delay={0.1}>
          <MotionItem>
            <InteractiveCard className="border-0 shadow-sm">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="text-base sm:text-2xl font-bold">{weeklyStats.fitnessCompletion}%</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Fitness</p>
              </CardContent>
            </InteractiveCard>
          </MotionItem>
          <MotionItem>
            <InteractiveCard className="border-0 shadow-sm">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="text-base sm:text-2xl font-bold">{weeklyStats.meditationMinutes}<span className="text-[10px] sm:text-sm">m</span></div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Meditate</p>
              </CardContent>
            </InteractiveCard>
          </MotionItem>
          <MotionItem>
            <InteractiveCard className="border-0 shadow-sm">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Apple className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="text-base sm:text-2xl font-bold">{weeklyStats.nutritionAdherence}%</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Nutrition</p>
              </CardContent>
            </InteractiveCard>
          </MotionItem>
          <MotionItem>
            <InteractiveCard className="border-0 shadow-sm">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="text-base sm:text-2xl font-bold">{weeklyStats.communityEngagement}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Social</p>
              </CardContent>
            </InteractiveCard>
          </MotionItem>
        </MotionList>

        {/* Detailed Charts */}
        <MotionFadeIn delay={0.3}>
        <Tabs defaultValue="fitness" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10">
            <TabsTrigger value="fitness" className="text-[10px] sm:text-sm px-1 sm:px-3">Fitness</TabsTrigger>
            <TabsTrigger value="meditation" className="text-[10px] sm:text-sm px-1 sm:px-3">Mind</TabsTrigger>
            <TabsTrigger value="nutrition" className="text-[10px] sm:text-sm px-1 sm:px-3">Diet</TabsTrigger>
            <TabsTrigger value="community" className="text-[10px] sm:text-sm px-1 sm:px-3">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="fitness" className="space-y-3 sm:space-y-4">
            <MotionFadeIn delay={0.1}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Fitness Activity Trends</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Daily activity completion over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    completed: { label: "Completed", color: "hsl(var(--primary))" },
                    total: { label: "Total", color: "hsl(var(--muted))" }
                  }} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fitnessData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                        <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </MotionFadeIn>

            <MotionFadeIn delay={0.2}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Completion Rate</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Percentage of completed activities</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    completionRate: { label: "Completion Rate", color: "hsl(var(--primary))" }
                  }} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={fitnessData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="completionRate" stroke="hsl(var(--primary))" strokeWidth={2} name="Completion %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </MotionFadeIn>
          </TabsContent>

          <TabsContent value="meditation" className="space-y-3 sm:space-y-4">
            <MotionFadeIn delay={0.1}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Meditation Consistency</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Daily meditation minutes over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    minutes: { label: "Minutes", color: "hsl(var(--primary))" }
                  }} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={meditationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="minutes" fill="hsl(var(--primary))" name="Minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </MotionFadeIn>

            <MotionFadeIn delay={0.2}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Session Frequency</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Number of meditation sessions per day</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    sessions: { label: "Sessions", color: "hsl(var(--secondary))" }
                  }} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={meditationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="sessions" stroke="hsl(var(--secondary))" strokeWidth={2} name="Sessions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </MotionFadeIn>
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-3 sm:space-y-4">
            <MotionFadeIn delay={0.1}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Nutrition Adherence</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Meal plan completion over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    completed: { label: "Completed", color: "hsl(var(--primary))" },
                    planned: { label: "Planned", color: "hsl(var(--muted))" }
                  }} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nutritionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                        <Bar dataKey="planned" fill="hsl(var(--muted))" name="Planned" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </MotionFadeIn>

            <MotionFadeIn delay={0.2}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Adherence Percentage</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Daily meal plan adherence rate</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    adherence: { label: "Adherence", color: "hsl(var(--primary))" }
                  }} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={nutritionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="adherence" stroke="hsl(var(--primary))" strokeWidth={2} name="Adherence %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </MotionFadeIn>
          </TabsContent>

          <TabsContent value="community" className="space-y-3 sm:space-y-4">
            <MotionFadeIn delay={0.1}>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Community Engagement</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your social activity breakdown</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={{
                    posts: { label: "Posts", color: "hsl(var(--primary))" },
                    comments: { label: "Comments", color: "hsl(var(--secondary))" },
                    reactions: { label: "Reactions", color: "hsl(var(--accent))" }
                  }} className="h-[200px] sm:h-[300px]">
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
                          outerRadius={60}
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
            </MotionFadeIn>

            <MotionList className="grid grid-cols-2 gap-3 sm:gap-4" delay={0.2}>
              <MotionItem>
                <InteractiveCard className="border-0 shadow-sm">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-lg">Communities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="text-2xl sm:text-4xl font-bold text-primary">{communityStats.communities}</div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Active</p>
                  </CardContent>
                </InteractiveCard>
              </MotionItem>
              <MotionItem>
                <InteractiveCard className="border-0 shadow-sm">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-lg">Interactions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="text-2xl sm:text-4xl font-bold text-primary">{weeklyStats.communityEngagement}</div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Total</p>
                  </CardContent>
                </InteractiveCard>
              </MotionItem>
            </MotionList>
          </TabsContent>
        </Tabs>
        </MotionFadeIn>
      </main>

    </div>
  );
};

export default Progress;
