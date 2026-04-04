import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, InteractiveCard, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(true);

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
            setIsLoading(false);
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
    { title: "Planner", icon: Calendar, path: "/planner", color: "bg-primary/10 text-primary", hoverBg: "hsl(var(--primary) / 0.2)", rotate: -8, glow: "hsl(var(--primary) / 0.35)" },
    { title: "Workouts", icon: Dumbbell, path: "/workouts", color: "bg-secondary/10 text-secondary", hoverBg: "hsl(var(--secondary) / 0.2)", rotate: 8, glow: "hsl(var(--secondary) / 0.35)" },
    { title: "Mindfulness", icon: Brain, path: "/mindfulness", color: "bg-accent/10 text-accent", hoverBg: "hsl(var(--accent) / 0.2)", rotate: -6, glow: "hsl(var(--accent) / 0.35)" },
    { title: "Nutrition", icon: Utensils, path: "/nutrition", color: "bg-primary/10 text-primary", hoverBg: "hsl(var(--primary) / 0.2)", rotate: 6, glow: "hsl(var(--primary) / 0.35)" },
  ];

  const dashboardItems = [
    { title: "Today's Activities", description: "Plan your daily wellness", icon: Calendar, path: "/planner" },
    
    { title: "Leaderboard", description: "Compete with friends", icon: Crown, path: "/leaderboard" },
    { title: "Upcoming Events", description: "Discover fitness events", icon: Calendar, path: "/events" },
    { title: "Communities", description: "Connect with others", icon: Users, path: "/communities" },
    { title: "Messages", description: "Chat with friends", icon: MessageSquare, path: "/messages" },
    { title: "Progress Analytics", description: "Track your trends", icon: TrendingUp, path: "/progress" },
    { title: "My Goals", description: "Set and track targets", icon: Target, path: "/goals" },
    { title: "Report a Problem", description: "Submit issues or feedback", icon: AlertCircle, path: "/report-problem" },
  ];

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="MindFit Connect" className="w-12 h-12 rounded-xl animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <MotionHeader className="bg-gradient-hero text-white px-4 pt-12 pb-6 safe-area-top">
        <div className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto">
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
      <main className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto px-4 -mt-3 space-y-6 relative z-10">
        {/* Stats Card - Subtle scale + fade */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.5, 
            delay: 0.15,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
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
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: 0.35 + i * 0.08, 
                          duration: 0.4,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                      >
                        <stat.icon className={cn("h-5 w-5 mx-auto mb-1", stat.color)} />
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div 
                    className="px-4 pb-4 pt-2 bg-muted/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                  >
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Level {stats?.current_level || 1}
                      </span>
                      <span className="text-muted-foreground">{levelProgress.current} / {levelProgress.next} XP</span>
                    </div>
                    <Progress value={levelProgress.percentage} className="h-2" />
                  </motion.div>
                </>
              )}
            </CardContent>
          </InteractiveCard>
        </motion.div>

        {/* Quick Actions - Staggered fade up */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.4 + i * 0.06,
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              >
                <motion.button
                  onClick={() => navigate(action.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl overflow-visible",
                    action.color
                  )}
                  whileHover={{
                    scale: 1.08,
                    y: -4,
                    transition: { type: "spring", stiffness: 400, damping: 20 },
                  }}
                  whileTap={{
                    scale: 0.94,
                    transition: { type: "spring", stiffness: 500, damping: 25 },
                  }}
                >
                  <span
                    className="pointer-events-none absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full blur-md opacity-60"
                    style={{ backgroundColor: action.glow }}
                  />
                  <action.icon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">{action.title}</span>
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features List - Cascading stagger */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <motion.h2 
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            Explore
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {dashboardItems.map((item, i) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 12, x: i % 2 === 0 ? -8 : 8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ 
                  delay: 0.6 + i * 0.05,
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              >
                <InteractiveCard 
                  className="border-0 shadow-sm cursor-pointer"
                  onClick={() => navigate(item.path)}
                  hoverScale={1.01}
                  tapScale={0.99}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <motion.div 
                      className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"
                      whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1, transition: { duration: 0.4 } }}
                      whileTap={{ scale: 0.92 }}
                    >
                      <item.icon className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </InteractiveCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Admin Dashboard Card - Subtle slide in */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <InteractiveCard 
              className="border-0 shadow-sm cursor-pointer bg-gradient-to-r from-destructive/10 to-primary/10"
              onClick={() => navigate("/admin")}
              hoverScale={1.02}
              tapScale={0.98}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <motion.div 
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-destructive/20 flex items-center justify-center"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1, transition: { duration: 0.4 } }}
                  whileTap={{ scale: 0.92 }}
                >
                  <Shield className="h-5 w-5 text-destructive" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Admin Dashboard</h3>
                  <p className="text-xs text-muted-foreground">Manage users, content & platform settings</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </InteractiveCard>
          </motion.div>
        )}

        {/* Moderator Panel Card */}
        {hasElevatedRole && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.95, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <InteractiveCard 
              className="border-0 shadow-sm cursor-pointer bg-gradient-to-r from-primary/10 to-secondary/10"
              onClick={() => navigate("/moderator")}
              hoverScale={1.02}
              tapScale={0.98}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <motion.div 
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1, transition: { duration: 0.4 } }}
                  whileTap={{ scale: 0.92 }}
                >
                  <Shield className="h-5 w-5 text-primary" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Moderator Panel</h3>
                  <p className="text-xs text-muted-foreground">Review content, reports & manage community</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </InteractiveCard>
          </motion.div>
        )}

      </main>

    </div>
  );
};

export default Dashboard;
