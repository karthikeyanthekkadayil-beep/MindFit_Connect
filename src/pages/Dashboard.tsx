import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, InteractiveCard, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { useGamification } from "@/hooks/useGamification";
import { 
  Calendar, Users, MessageSquare, Dumbbell, Utensils, Brain, 
  TrendingUp, Target, LogOut, Trophy, Flame, Star, Crown, ChevronRight,
  Sparkles, Shield, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { MotionHeader, MotionFadeIn, MotionScaleIn, MotionSection, MotionList, MotionItem } from "@/components/motion/MotionWrappers";
import { motion } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasElevatedRole, setHasElevatedRole] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data }) => {
            const roles = data?.map(r => r.role) || [];
            setIsAdmin(roles.includes("admin"));
            setHasElevatedRole(roles.includes("admin") || roles.includes("moderator"));
          });
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

  const quickActions = [
    { title: "Planner", icon: Calendar, path: "/planner", color: "bg-primary/10 text-primary" },
    { title: "Workouts", icon: Dumbbell, path: "/workouts", color: "bg-secondary/10 text-secondary" },
    { title: "Mindfulness", icon: Brain, path: "/mindfulness", color: "bg-accent/10 text-accent" },
    { title: "Nutrition", icon: Utensils, path: "/nutrition", color: "bg-primary/10 text-primary" },
  ];

  const dashboardItems = [
    { title: "Today's Activities", description: "Plan your daily wellness", icon: Calendar, path: "/planner" },
    { title: "Wellness Balance", description: "Track holistic wellness", icon: TrendingUp, path: "/balance" },
    { title: "Leaderboard", description: "Compete with friends", icon: Crown, path: "/leaderboard" },
    { title: "Upcoming Events", description: "Discover fitness events", icon: Calendar, path: "/events" },
    { title: "Communities", description: "Connect with others", icon: Users, path: "/communities" },
    { title: "Messages", description: "Chat with friends", icon: MessageSquare, path: "/messages" },
    { title: "Progress Analytics", description: "Track your trends", icon: TrendingUp, path: "/progress" },
    { title: "My Goals", description: "Set and track targets", icon: Target, path: "/goals" },
    { title: "Report a Problem", description: "Submit issues or feedback", icon: AlertCircle, path: "/report-problem" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <MotionHeader className="bg-gradient-hero text-white px-4 pt-12 pb-6 safe-area-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <MotionFadeIn className="flex items-center gap-2.5" delay={0.1}>
              <img src={logo} alt="MindFit Connect" className="w-9 h-9 rounded-lg shadow-md" />
              <h1 className="text-2xl font-heading font-bold text-accent drop-shadow-md">MindFit Connect</h1>
            </MotionFadeIn>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            >
              <Button 
                onClick={handleLogout} 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/20 rounded-full h-10 w-10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </MotionHeader>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-3 space-y-5">
        {/* Stats Card */}
        <MotionScaleIn delay={0.15}>
          <InteractiveCard 
            className="overflow-hidden border-0 shadow-lg cursor-pointer"
            onClick={() => navigate('/rewards')}
          >
            <CardContent className="p-0">
              {gamificationLoading ? (
                <div className="p-5 animate-pulse space-y-3">
                  <div className="h-16 bg-muted rounded-lg"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 divide-x divide-border">
                    {[
                      { icon: Star, value: stats?.total_points || 0, label: "Points", color: "text-amber-500" },
                      { icon: Crown, value: stats?.current_level || 1, label: "Level", color: "text-primary" },
                      { icon: Flame, value: stats?.current_streak || 0, label: "Streak", color: "text-secondary" },
                      { icon: Trophy, value: earnedAchievements.length, label: "Badges", color: "text-accent" },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        className="text-center py-4 px-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <stat.icon className={cn("h-5 w-5 mx-auto mb-1", stat.color)} />
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  <MotionFadeIn delay={0.5} className="px-4 pb-4 pt-2 bg-muted/30">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Level {stats?.current_level || 1}
                      </span>
                      <span className="text-muted-foreground">{levelProgress.current} / {levelProgress.next} XP</span>
                    </div>
                    <Progress value={levelProgress.percentage} className="h-2" />
                  </MotionFadeIn>
                </>
              )}
            </CardContent>
          </InteractiveCard>
        </MotionScaleIn>

        {/* Quick Actions */}
        <MotionSection delay={0.3}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <MotionList className="scroll-x -mx-4 px-4" delay={0.35}>
            {quickActions.map((action) => (
              <MotionItem key={action.path}>
                <button
                  onClick={() => navigate(action.path)}
                  className={cn(
                    "flex flex-col items-center justify-center w-20 h-20 rounded-2xl press-effect",
                    action.color
                  )}
                >
                  <action.icon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">{action.title}</span>
                </button>
              </MotionItem>
            ))}
          </MotionList>
        </MotionSection>

        {/* Features List */}
        <MotionSection delay={0.4}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Explore
          </h2>
          <MotionList className="space-y-2" delay={0.45}>
            {dashboardItems.map((item) => (
              <MotionItem key={item.path}>
                <InteractiveCard 
                  className="border-0 shadow-sm cursor-pointer"
                  onClick={() => navigate(item.path)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </InteractiveCard>
              </MotionItem>
            ))}
          </MotionList>
        </MotionSection>

        {/* Admin Dashboard Card */}
        {isAdmin && (
          <MotionFadeIn delay={0.6}>
            <InteractiveCard 
              className="border-0 shadow-sm cursor-pointer bg-gradient-to-r from-destructive/10 to-primary/10"
              onClick={() => navigate("/admin")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Admin Dashboard</h3>
                  <p className="text-xs text-muted-foreground">Manage users, content & platform settings</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </InteractiveCard>
          </MotionFadeIn>
        )}

        {/* Moderator Panel Card */}
        {hasElevatedRole && (
          <MotionFadeIn delay={0.65}>
            <InteractiveCard 
              className="border-0 shadow-sm cursor-pointer bg-gradient-to-r from-primary/10 to-secondary/10"
              onClick={() => navigate("/moderator")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Moderator Panel</h3>
                  <p className="text-xs text-muted-foreground">Review content, reports & manage community</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </InteractiveCard>
          </MotionFadeIn>
        )}

      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
