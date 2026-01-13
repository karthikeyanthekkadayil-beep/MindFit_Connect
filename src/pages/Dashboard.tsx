import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { useGamification } from "@/hooks/useGamification";
import { 
  Calendar, Users, MessageSquare, Dumbbell, Utensils, Brain, 
  TrendingUp, Target, LogOut, Trophy, Flame, Star, Crown, ArrowRight 
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { stats, earnedAchievements, getLevelProgress, loading: gamificationLoading } = useGamification(user?.id || null);
  const levelProgress = getLevelProgress();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const dashboardItems = [
    { title: "Today's Activities", description: "Plan your daily wellness activities", icon: Calendar, path: "/planner" },
    { title: "Wellness Balance", description: "Track your holistic wellness", icon: TrendingUp, path: "/balance" },
    { title: "Leaderboard", description: "Compete with friends & community", icon: Crown, path: "/leaderboard" },
    { title: "Upcoming Events", description: "Discover and join fitness events", icon: Calendar, path: "/events" },
    { title: "Your Communities", description: "Connect with like-minded people", icon: Users, path: "/communities" },
    { title: "Messages", description: "Chat with friends and groups", icon: MessageSquare, path: "/messages" },
    { title: "Workouts", description: "Browse workout library", icon: Dumbbell, path: "/workouts" },
    { title: "Nutrition", description: "Plan your meals and nutrition", icon: Utensils, path: "/nutrition" },
    { title: "Mindfulness", description: "Meditation and breathing exercises", icon: Brain, path: "/mindfulness" },
    { title: "Progress Analytics", description: "Track your wellness trends", icon: TrendingUp, path: "/progress" },
    { title: "My Goals", description: "Set and track your targets", icon: Target, path: "/goals" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold">MindFit Connect</h1>
            <p className="text-white/90 mt-1 text-sm sm:text-base">Welcome back!</p>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Gamification Stats Card */}
        <Card 
          className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/rewards')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm sm:text-base">Your Progress</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            
            {gamificationLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-muted rounded-lg"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{stats?.total_points || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Points</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50">
                    <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{stats?.current_level || 1}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Level</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-secondary mx-auto mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{stats?.current_streak || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Streak</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-accent mx-auto mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{earnedAchievements.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Badges</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Level {stats?.current_level || 1}</span>
                    <span className="text-muted-foreground">{levelProgress.current} / {levelProgress.next} XP</span>
                  </div>
                  <Progress value={levelProgress.percentage} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-heading text-lg sm:text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-muted-foreground text-sm sm:text-base">
              Your personalized dashboard is ready. Start exploring your wellness journey!
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {dashboardItems.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]" 
              onClick={() => navigate(item.path)}
            >
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-2">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <CardTitle className="text-sm sm:text-lg leading-tight">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
