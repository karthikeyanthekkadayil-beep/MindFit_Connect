import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/BottomNav";
import { useGamification } from "@/hooks/useGamification";
import { format, parseISO } from "date-fns";
import { 
  Trophy, Star, Flame, Zap, Crown, Medal, Award, Target, 
  TrendingUp, Gift, Sparkles, Heart, Brain, Users, Dumbbell,
  Calendar, Smile, ArrowRight, Lock
} from "lucide-react";
import { MotionHeader, MotionFadeIn, MotionScaleIn, MotionList, MotionItem } from "@/components/motion/MotionWrappers";
import { motion } from "framer-motion";

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  fire: Flame,
  zap: Zap,
  crown: Crown,
  medal: Medal,
  award: Award,
  target: Target,
  'trending-up': TrendingUp,
  gift: Gift,
  sparkles: Sparkles,
  heart: Heart,
  'heart-pulse': Heart,
  brain: Brain,
  users: Users,
  dumbbell: Dumbbell,
  calendar: Calendar,
  smile: Smile,
  'party-popper': Sparkles,
};

const BADGE_COLORS: Record<string, string> = {
  primary: 'bg-primary/10 border-primary/30 text-primary',
  secondary: 'bg-secondary/10 border-secondary/30 text-secondary',
  accent: 'bg-accent/10 border-accent/30 text-accent',
  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
  green: 'bg-green-500/10 border-green-500/30 text-green-500',
  pink: 'bg-pink-500/10 border-pink-500/30 text-pink-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  streak: 'Streaks',
  mindfulness: 'Mindfulness',
  social: 'Social',
  wellness: 'Wellness',
  level: 'Levels',
};

const Rewards = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    setLoading(false);
  };

  const {
    stats,
    achievements,
    earnedAchievements,
    recentTransactions,
    loading: gamificationLoading,
    getLevelProgress,
    refresh,
  } = useGamification(userId);

  const levelProgress = getLevelProgress();
  const earnedIds = earnedAchievements.map(ea => ea.achievement_id);

  // Group achievements by category
  const achievementsByCategory = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  if (loading || gamificationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MotionHeader className="bg-gradient-hero text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
              <div>
                <h1 className="text-xl sm:text-3xl font-heading font-bold">Rewards & Achievements</h1>
                <p className="text-white/90 text-xs sm:text-base">MindFit Connect • Track your progress</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/leaderboard')}
              className="gap-1 sm:gap-2"
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
          </div>
        </div>
      </MotionHeader>

      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <MotionList className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4" delay={0.1}>
          <MotionItem>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-3 sm:p-4 text-center">
                <motion.div whileHover={{ rotate: [0, -15, 15, -8, 0], scale: 1.2, transition: { duration: 0.5 } }} whileTap={{ scale: 0.85 }}>
                  <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
                </motion.div>
                <p className="text-xl sm:text-3xl font-bold text-primary">{stats?.total_points || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Points</p>
              </CardContent>
            </Card>
          </MotionItem>

          <MotionItem>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-3 sm:p-4 text-center">
                <motion.div whileHover={{ y: -4, rotate: 12, scale: 1.2, transition: { type: "spring", stiffness: 300 } }} whileTap={{ scale: 0.85, rotate: -12 }}>
                  <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 mx-auto mb-2" />
                </motion.div>
                <p className="text-xl sm:text-3xl font-bold text-amber-500">Level {stats?.current_level || 1}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Current Level</p>
              </CardContent>
            </Card>
          </MotionItem>

          <MotionItem>
            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
              <CardContent className="p-3 sm:p-4 text-center">
                <motion.div
                  whileHover={{ scale: [1, 1.3, 1.1, 1.25, 1.15], transition: { duration: 0.6 } }}
                  whileTap={{ scale: 0.85 }}
                >
                  <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-secondary mx-auto mb-2" />
                </motion.div>
                <p className="text-xl sm:text-3xl font-bold text-secondary">{stats?.current_streak || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>
          </MotionItem>

          <MotionItem>
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
              <CardContent className="p-3 sm:p-4 text-center">
                <motion.div whileHover={{ rotate: [0, 20, -20, 10, 0], transition: { duration: 0.5 } }} whileTap={{ scale: 0.85, y: 2 }}>
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-accent mx-auto mb-2" />
                </motion.div>
                <p className="text-xl sm:text-3xl font-bold text-accent">{earnedAchievements.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Achievements</p>
              </CardContent>
            </Card>
          </MotionItem>
        </MotionList>

        {/* Level Progress */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-sm sm:text-base">Level {stats?.current_level || 1}</span>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {levelProgress.current} / {levelProgress.next} XP
              </span>
            </div>
            <Progress value={levelProgress.percentage} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {levelProgress.next - levelProgress.current} points to Level {(stats?.current_level || 1) + 1}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="achievements" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="achievements" className="text-xs sm:text-sm py-2">Achievements</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm py-2">Activity</TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs sm:text-sm py-2">Rewards</TabsTrigger>
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4 mt-4">
            {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
              <Card key={category}>
                <CardHeader className="p-3 sm:p-6 pb-2">
                  <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                    {CATEGORY_LABELS[category] || category}
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {categoryAchievements.filter(a => earnedIds.includes(a.id)).length}/{categoryAchievements.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {categoryAchievements.map((achievement) => {
                      const isEarned = earnedIds.includes(achievement.id);
                      const IconComponent = ICON_MAP[achievement.icon] || Trophy;
                      const colorClass = BADGE_COLORS[achievement.badge_color] || BADGE_COLORS.primary;
                      const earnedData = earnedAchievements.find(ea => ea.achievement_id === achievement.id);

                      return (
                        <motion.div
                          key={achievement.id}
                          className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            isEarned
                              ? colorClass
                              : 'bg-muted/30 border-muted text-muted-foreground opacity-60'
                          }`}
                          whileHover={isEarned ? { scale: 1.05, y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } } : {}}
                          whileTap={isEarned ? { scale: 0.95 } : {}}
                        >
                          {!isEarned && (
                            <Lock className="absolute top-2 right-2 h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                          <div className="flex flex-col items-center text-center">
                            <motion.div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 ${
                                isEarned ? 'bg-background/50' : 'bg-muted/50'
                              }`}
                              whileHover={isEarned ? { rotate: [0, -12, 12, -6, 0], transition: { duration: 0.5 } } : {}}
                            >
                              <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                            </motion.div>
                            <h4 className="font-semibold text-[10px] sm:text-xs line-clamp-1">{achievement.name}</h4>
                            <p className="text-[8px] sm:text-[10px] mt-1 line-clamp-2 opacity-80">
                              {achievement.description}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="h-3 w-3" />
                              <span className="text-[10px] sm:text-xs font-medium">{achievement.points_reward}</span>
                            </div>
                            {isEarned && earnedData && (
                              <p className="text-[8px] mt-1 opacity-70">
                                {format(parseISO(earnedData.earned_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your latest point earnings</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start completing activities to earn points!</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/workouts')}
                    >
                      Start a Workout
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTransactions.map((transaction) => (
                      <div 
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                            transaction.points > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            {transaction.points > 0 ? (
                              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                            ) : (
                              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium capitalize">
                              {transaction.transaction_type.replace('_', ' ')}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {transaction.description || format(parseISO(transaction.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm sm:text-base ${
                          transaction.points > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Streak Info */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                  Streak Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-secondary/10">
                    <Flame className="h-8 w-8 text-secondary mx-auto mb-2" />
                    <p className="text-2xl sm:text-3xl font-bold text-secondary">{stats?.current_streak || 0}</p>
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-amber-500/10">
                    <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl sm:text-3xl font-bold text-amber-500">{stats?.longest_streak || 0}</p>
                    <p className="text-xs text-muted-foreground">Best Streak</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Complete any activity daily to maintain your streak!
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Available Rewards
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Redeem your points for exclusive perks</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="space-y-3">
                  {[
                    { name: 'Custom Avatar Frame', points: 500, icon: Sparkles, available: true },
                    { name: 'Premium Workout Plan', points: 1000, icon: Dumbbell, available: true },
                    { name: 'VIP Community Badge', points: 2000, icon: Crown, available: true },
                    { name: 'Personal Coach Session', points: 5000, icon: Users, available: true },
                  ].map((reward, index) => {
                    const canAfford = (stats?.total_points || 0) >= reward.points;
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          canAfford ? 'border-primary/30 bg-primary/5' : 'border-muted bg-muted/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                            canAfford ? 'bg-primary/10' : 'bg-muted/50'
                          }`}>
                            <reward.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${canAfford ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm sm:text-base">{reward.name}</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500" />
                              <span className="text-xs text-muted-foreground">{reward.points} points</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant={canAfford ? "default" : "outline"} 
                          size="sm"
                          disabled={!canAfford}
                          className="text-xs"
                        >
                          {canAfford ? 'Redeem' : 'Locked'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* How to Earn Points */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-lg">How to Earn Points</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                {[
                  { action: 'Complete a workout', points: 50, icon: Dumbbell },
                  { action: 'Finish a meditation session', points: 30, icon: Brain },
                  { action: 'Log your mood', points: 10, icon: Smile },
                  { action: 'Attend an event', points: 40, icon: Calendar },
                  { action: 'Maintain daily streak', points: '5-50', icon: Flame },
                  { action: 'Unlock achievements', points: 'Varies', icon: Trophy },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="text-xs sm:text-sm">{item.action}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      +{item.points}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Rewards;
