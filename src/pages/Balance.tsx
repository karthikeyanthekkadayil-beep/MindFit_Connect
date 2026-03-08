import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/BottomNav";
import { MoodStressChart } from "@/components/MoodStressChart";
import { 
  Scale, Activity, Brain, Apple, Users, TrendingUp, Briefcase, 
  Heart, AlertTriangle, CheckCircle, Clock, Sparkles, Target
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { MotionHeader, MotionFadeIn, MotionScaleIn, MotionList, MotionItem, MotionSection } from "@/components/motion/MotionWrappers";

interface WellnessScore {
  category: string;
  score: number;
  fullMark: number;
  icon: React.ElementType;
  color: string;
}

interface BalanceInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  action?: string;
}

const Balance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wellnessScores, setWellnessScores] = useState<WellnessScore[]>([]);
  const [overallBalance, setOverallBalance] = useState(0);
  const [insights, setInsights] = useState<BalanceInsight[]>([]);
  const [workLifeData, setWorkLifeData] = useState({
    workHours: 0,
    personalHours: 0,
    fitnessHours: 0,
    socialHours: 0,
    restHours: 0
  });
  const [activityDistribution, setActivityDistribution] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await fetchBalanceData(session.user.id);
  };

  const fetchBalanceData = async (userId: string) => {
    setLoading(true);
    try {
      const last7Days = subDays(new Date(), 7).toISOString();

      // Fetch activities
      const { data: activities } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', format(subDays(new Date(), 7), 'yyyy-MM-dd'));

      // Fetch meditation sessions
      const { data: meditation } = await supabase
        .from('user_meditation_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('session_date', last7Days);

      // Fetch meal plans
      const { data: meals } = await supabase
        .from('user_meal_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('planned_date', format(subDays(new Date(), 7), 'yyyy-MM-dd'));

      // Fetch community engagement
      const { data: posts } = await supabase
        .from('community_posts')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', last7Days);

      const { data: comments } = await supabase
        .from('post_comments')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', last7Days);

      // Calculate scores
      const fitnessActivities = activities?.filter(a => 
        ['workout', 'fitness', 'exercise'].includes(a.activity_type.toLowerCase())
      ) || [];
      const completedFitness = fitnessActivities.filter(a => a.completed).length;
      const fitnessScore = fitnessActivities.length > 0 
        ? Math.min(100, Math.round((completedFitness / Math.max(fitnessActivities.length, 5)) * 100))
        : 0;

      const meditationMinutes = meditation?.reduce((sum, m) => sum + m.duration_minutes, 0) || 0;
      const meditationScore = Math.min(100, Math.round((meditationMinutes / 70) * 100)); // 10min/day target

      const completedMeals = meals?.filter(m => m.completed).length || 0;
      const nutritionScore = meals?.length ? Math.min(100, Math.round((completedMeals / meals.length) * 100)) : 0;

      const socialEngagement = (posts?.length || 0) + (comments?.length || 0);
      const socialScore = Math.min(100, socialEngagement * 10); // 10 interactions = 100%

      // Calculate work-life hours (simulated based on activity types)
      const workActivities = activities?.filter(a => 
        ['work', 'meeting', 'office'].includes(a.activity_type.toLowerCase())
      ) || [];
      const personalActivities = activities?.filter(a => 
        ['personal', 'hobby', 'leisure'].includes(a.activity_type.toLowerCase())
      ) || [];
      
      const workHours = workActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60;
      const fitnessHours = fitnessActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60;
      const meditationHours = meditationMinutes / 60;
      const personalHours = personalActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60;

      setWorkLifeData({
        workHours: Math.round(workHours * 10) / 10,
        personalHours: Math.round(personalHours * 10) / 10,
        fitnessHours: Math.round(fitnessHours * 10) / 10,
        socialHours: Math.round(socialEngagement * 0.25 * 10) / 10, // Estimate
        restHours: Math.round(meditationHours * 10) / 10
      });

      // Set wellness scores
      const scores: WellnessScore[] = [
        { category: 'Fitness', score: fitnessScore, fullMark: 100, icon: Activity, color: 'hsl(var(--primary))' },
        { category: 'Mindfulness', score: meditationScore, fullMark: 100, icon: Brain, color: 'hsl(var(--secondary))' },
        { category: 'Nutrition', score: nutritionScore, fullMark: 100, icon: Apple, color: 'hsl(var(--accent))' },
        { category: 'Social', score: socialScore, fullMark: 100, icon: Users, color: 'hsl(142, 76%, 36%)' },
      ];
      setWellnessScores(scores);

      // Calculate overall balance
      const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
      setOverallBalance(Math.round(avgScore));

      // Activity distribution for pie chart
      setActivityDistribution([
        { name: 'Fitness', value: fitnessHours || 1, color: 'hsl(var(--primary))' },
        { name: 'Mindfulness', value: meditationHours || 0.5, color: 'hsl(var(--secondary))' },
        { name: 'Nutrition', value: (completedMeals * 0.5) || 1, color: 'hsl(var(--accent))' },
        { name: 'Social', value: socialEngagement * 0.25 || 0.5, color: 'hsl(142, 76%, 36%)' },
      ]);

      // Generate insights
      const newInsights: BalanceInsight[] = [];
      
      if (fitnessScore < 30) {
        newInsights.push({
          type: 'warning',
          title: 'Low Fitness Activity',
          description: 'You\'ve completed fewer workouts this week. Consider adding a quick 15-minute session.',
          action: 'View Workouts'
        });
      } else if (fitnessScore >= 80) {
        newInsights.push({
          type: 'success',
          title: 'Great Fitness Progress!',
          description: 'You\'re crushing your fitness goals. Keep up the momentum!'
        });
      }

      if (meditationScore < 30) {
        newInsights.push({
          type: 'warning',
          title: 'Mindfulness Needs Attention',
          description: 'Taking a few minutes for meditation can significantly reduce stress.',
          action: 'Start Meditation'
        });
      }

      if (socialScore < 20) {
        newInsights.push({
          type: 'info',
          title: 'Connect with Community',
          description: 'Engaging with others can boost motivation. Share your progress or join a discussion!',
          action: 'Visit Communities'
        });
      }

      if (avgScore >= 70) {
        newInsights.push({
          type: 'success',
          title: 'Well-Balanced Week!',
          description: 'You\'re maintaining a healthy balance across all wellness areas.'
        });
      }

      // Check for overtraining
      if (fitnessScore > 90 && meditationScore < 30) {
        newInsights.push({
          type: 'warning',
          title: 'Consider Rest & Recovery',
          description: 'High workout intensity with low recovery time. Balance with some mindfulness.',
          action: 'Try Breathing Exercise'
        });
      }

      setInsights(newInsights);

    } catch (error) {
      console.error('Error fetching balance data:', error);
      toast.error('Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: BalanceInsight['type']) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Sparkles;
    }
  };

  const getInsightStyles = (type: BalanceInsight['type']) => {
    switch (type) {
      case 'warning': return 'border-amber-500/50 bg-amber-500/10';
      case 'success': return 'border-green-500/50 bg-green-500/10';
      default: return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  const handleInsightAction = (action?: string) => {
    switch (action) {
      case 'View Workouts': navigate('/workouts'); break;
      case 'Start Meditation': navigate('/mindfulness'); break;
      case 'Visit Communities': navigate('/communities'); break;
      case 'Try Breathing Exercise': navigate('/mindfulness'); break;
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(142, 76%, 36%)'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Analyzing your balance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MotionHeader className="bg-gradient-hero text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <Scale className="h-6 w-6 sm:h-8 sm:w-8" />
            <div>
              <h1 className="text-xl sm:text-3xl font-heading font-bold">Wellness Balance</h1>
              <p className="text-white/90 text-xs sm:text-base">MindFit Connect • Holistic wellness tracking</p>
            </div>
          </div>
        </div>
      </MotionHeader>

      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Overall Balance Score */}
        <MotionScaleIn delay={0.1}>
        <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary/30 flex items-center justify-center bg-background">
                  <div className="text-center">
                    <div className="text-2xl sm:text-4xl font-bold text-primary">{overallBalance}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Balance Score</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  {overallBalance >= 70 ? 'Well Balanced!' : overallBalance >= 40 ? 'Room for Improvement' : 'Needs Attention'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {overallBalance >= 70 
                    ? 'You\'re maintaining a healthy balance across fitness, nutrition, mindfulness, and social activities.'
                    : 'Focus on the areas highlighted below to improve your overall wellness balance.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </MotionScaleIn>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="dashboard" className="text-[10px] sm:text-sm py-2 px-1">Dashboard</TabsTrigger>
            <TabsTrigger value="mental" className="text-[10px] sm:text-sm py-2 px-1">Mental</TabsTrigger>
            <TabsTrigger value="insights" className="text-[10px] sm:text-sm py-2 px-1">Insights</TabsTrigger>
            <TabsTrigger value="worklife" className="text-[10px] sm:text-sm py-2 px-1">Work-Life</TabsTrigger>
            <TabsTrigger value="exercises" className="text-[10px] sm:text-sm py-2 px-1">Exercises</TabsTrigger>
          </TabsList>

          {/* Wellness Dashboard */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {/* Category Scores */}
            <MotionList className="grid grid-cols-2 gap-2 sm:gap-4" delay={0.1}>
              {wellnessScores.map((item) => (
                <MotionItem key={item.category}>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">{item.category}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold mb-1">{item.score}%</div>
                    <Progress value={item.score} className="h-2" />
                  </CardContent>
                </Card>
                </MotionItem>
              ))}
            </MotionList>

            {/* Radar Chart */}
            <MotionFadeIn delay={0.2}>
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg">Balance Overview</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your wellness distribution across categories</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <div className="h-[200px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={wellnessScores}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            </MotionFadeIn>

            {/* Activity Distribution */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg">Time Distribution</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Hours spent on each wellness area this week</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <div className="h-[180px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {activityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mental Wellness Tab */}
          <TabsContent value="mental" className="space-y-4 mt-4">
            {userId ? (
              <MoodStressChart userId={userId} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Loading...
                </CardContent>
              </Card>
            )}

            {/* Quick Mental Wellness Actions */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  Quick Relief
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Instant stress-relief activities</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 sm:h-14"
                  onClick={() => navigate('/mindfulness')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-xs sm:text-sm">5-Minute Meditation</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Quick calm session</p>
                    </div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 sm:h-14"
                  onClick={() => navigate('/mindfulness')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-xs sm:text-sm">Box Breathing</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">4-4-4-4 technique</p>
                    </div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 sm:h-14"
                  onClick={() => navigate('/communities')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-xs sm:text-sm">Talk to Community</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Connect with others</p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Mental Wellness Tips */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Daily Wellness Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs sm:text-sm font-medium">🌟 Tip of the Day</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    Take a 5-minute break every hour to stretch and breathe deeply. Small pauses boost productivity and reduce stress.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                  <p className="text-xs sm:text-sm font-medium">💪 Affirmation</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    "I am capable of handling whatever comes my way today. I choose calm over chaos."
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-xs sm:text-sm font-medium">🎯 Focus Reminder</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    Progress, not perfection. Every small step towards your wellness goals counts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Balance Insights */}
          <TabsContent value="insights" className="space-y-3 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  AI-Powered Insights
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Personalized recommendations based on your activity</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                {insights.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Complete more activities to receive personalized insights!
                  </p>
                ) : (
                  insights.map((insight, index) => {
                    const Icon = getInsightIcon(insight.type);
                    return (
                      <div 
                        key={index} 
                        className={`p-3 sm:p-4 rounded-lg border ${getInsightStyles(insight.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5 ${
                            insight.type === 'warning' ? 'text-amber-500' :
                            insight.type === 'success' ? 'text-green-500' : 'text-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-xs sm:text-sm">{insight.title}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{insight.description}</p>
                            {insight.action && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="mt-2 h-7 sm:h-8 text-xs"
                                onClick={() => handleInsightAction(insight.action)}
                              >
                                {insight.action}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg">Balance Tips</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Aim for at least 30 minutes of movement daily</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Take 5-10 minute meditation breaks between tasks</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Connect with community members at least once daily</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Balance high-intensity workouts with recovery activities</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work-Life Balance */}
          <TabsContent value="worklife" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <CardTitle className="text-sm sm:text-lg">Work-Life Balance</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Time allocation this week (hours)</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" /> Work
                      </span>
                      <span>{workLifeData.workHours}h</span>
                    </div>
                    <Progress value={Math.min((workLifeData.workHours / 40) * 100, 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Activity className="h-3 w-3 sm:h-4 sm:w-4" /> Fitness
                      </span>
                      <span>{workLifeData.fitnessHours}h</span>
                    </div>
                    <Progress value={Math.min((workLifeData.fitnessHours / 7) * 100, 100)} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Brain className="h-3 w-3 sm:h-4 sm:w-4" /> Rest & Recovery
                      </span>
                      <span>{workLifeData.restHours}h</span>
                    </div>
                    <Progress value={Math.min((workLifeData.restHours / 3) * 100, 100)} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" /> Social
                      </span>
                      <span>{workLifeData.socialHours}h</span>
                    </div>
                    <Progress value={Math.min((workLifeData.socialHours / 5) * 100, 100)} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4" /> Personal
                      </span>
                      <span>{workLifeData.personalHours}h</span>
                    </div>
                    <Progress value={Math.min((workLifeData.personalHours / 10) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminders Section */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  Balance Reminders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Movement Break</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">Every 2 hours</Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Stand up and stretch</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Mindfulness Moment</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">3x daily</Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">5-minute breathing exercise</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Social Check-in</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">Daily</Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Connect with community</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Physical Balance Exercises */}
          <TabsContent value="exercises" className="space-y-3 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg">Physical Balance Training</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Exercises to improve stability, coordination, and body balance</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                {[
                  { 
                    name: 'Single Leg Stand', 
                    duration: '30 sec each leg',
                    difficulty: 'Beginner',
                    description: 'Stand on one leg, hold position. Great for ankle stability.'
                  },
                  { 
                    name: 'Tree Pose (Vrikshasana)', 
                    duration: '1 min each side',
                    difficulty: 'Beginner',
                    description: 'Classic yoga pose for balance and focus.'
                  },
                  { 
                    name: 'Heel-to-Toe Walk', 
                    duration: '2-3 minutes',
                    difficulty: 'Beginner',
                    description: 'Walk in a straight line placing heel directly in front of toes.'
                  },
                  { 
                    name: 'Warrior III', 
                    duration: '30 sec each side',
                    difficulty: 'Intermediate',
                    description: 'Challenging yoga pose that builds core and leg strength.'
                  },
                  { 
                    name: 'BOSU Ball Squats', 
                    duration: '10-15 reps',
                    difficulty: 'Intermediate',
                    description: 'Squats on unstable surface for advanced balance training.'
                  },
                  { 
                    name: 'Single Leg Deadlift', 
                    duration: '10 reps each leg',
                    difficulty: 'Advanced',
                    description: 'Combines balance with hip hinge movement pattern.'
                  },
                ].map((exercise, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm">{exercise.name}</h4>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{exercise.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[9px] sm:text-xs">{exercise.duration}</Badge>
                          <Badge 
                            className={`text-[9px] sm:text-xs ${
                              exercise.difficulty === 'Beginner' ? 'bg-green-500/10 text-green-500' :
                              exercise.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {exercise.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={() => navigate('/workouts')}
            >
              <Target className="h-4 w-4 mr-2" />
              Explore Full Workout Library
            </Button>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Balance;