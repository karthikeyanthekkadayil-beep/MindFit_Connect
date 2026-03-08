import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { Heart, MessageCircle, Target, TrendingUp, Send } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { MotionHeader, MotionFadeIn, MotionList, MotionItem } from "@/components/motion/MotionWrappers";

interface SharedGoal {
  id: string;
  goal_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  end_date: string;
  status: string;
  owner_name: string;
  owner_avatar: string;
  cheer_count: number;
  comment_count: number;
  user_id: string;
}

const SharedGoals = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<SharedGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [userCheers, setUserCheers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchSharedGoals(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchSharedGoals = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch public goals
      const { data: publicGoals, error: publicError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'active')
        .neq('user_id', userId);

      if (publicError) throw publicError;

      // Fetch profiles using security definer function
      const ownerIds = publicGoals?.map(g => g.user_id) || [];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: ownerIds });

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine and format goals
      const allGoals: SharedGoal[] = publicGoals?.map(g => ({
        ...g,
        owner_name: profileMap.get(g.user_id)?.full_name || 'Anonymous',
        owner_avatar: profileMap.get(g.user_id)?.avatar_url || '',
        cheer_count: 0,
        comment_count: 0
      })) || [];

      // Fetch interaction counts
      const goalIds = allGoals.map(g => g.id);
      if (goalIds.length > 0) {
        const { data: interactions } = await supabase
          .from('goal_interactions')
          .select('goal_id, interaction_type')
          .in('goal_id', goalIds);

        // Count cheers and comments
        allGoals.forEach(goal => {
          const goalInteractions = interactions?.filter(i => i.goal_id === goal.id) || [];
          goal.cheer_count = goalInteractions.filter(i => i.interaction_type === 'cheer').length;
          goal.comment_count = goalInteractions.filter(i => i.interaction_type === 'comment').length;
        });

        // Fetch user's cheers
        const { data: userCheersData } = await supabase
          .from('goal_interactions')
          .select('goal_id')
          .eq('user_id', userId)
          .eq('interaction_type', 'cheer')
          .in('goal_id', goalIds);

        setUserCheers(new Set(userCheersData?.map(c => c.goal_id) || []));
      }

      setGoals(allGoals);
    } catch (error) {
      console.error('Error fetching shared goals:', error);
      toast.error('Failed to load shared goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCheer = async (goalId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (userCheers.has(goalId)) {
        // Remove cheer
        const { error } = await supabase
          .from('goal_interactions')
          .delete()
          .eq('goal_id', goalId)
          .eq('user_id', session.user.id)
          .eq('interaction_type', 'cheer');

        if (error) throw error;

        setUserCheers(prev => {
          const newSet = new Set(prev);
          newSet.delete(goalId);
          return newSet;
        });
        setGoals(goals.map(g => 
          g.id === goalId ? { ...g, cheer_count: g.cheer_count - 1 } : g
        ));
      } else {
        // Add cheer
        const { error } = await supabase
          .from('goal_interactions')
          .insert({
            goal_id: goalId,
            user_id: session.user.id,
            interaction_type: 'cheer'
          });

        if (error) throw error;

        setUserCheers(prev => new Set(prev).add(goalId));
        setGoals(goals.map(g => 
          g.id === goalId ? { ...g, cheer_count: g.cheer_count + 1 } : g
        ));
        toast.success('Cheer sent! 🎉');
      }
    } catch (error) {
      console.error('Error toggling cheer:', error);
      toast.error('Failed to send cheer');
    }
  };

  const handleComment = async (goalId: string) => {
    if (!comment.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('goal_interactions')
        .insert({
          goal_id: goalId,
          user_id: session.user.id,
          interaction_type: 'comment',
          content: comment
        });

      if (error) throw error;

      setGoals(goals.map(g => 
        g.id === goalId ? { ...g, comment_count: g.comment_count + 1 } : g
      ));
      setComment('');
      setSelectedGoal(null);
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const getProgressPercentage = (goal: SharedGoal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getDaysRemaining = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'fitness': return '💪';
      case 'meditation': return '🧘';
      case 'nutrition': return '🍎';
      case 'community': return '👥';
      default: return '🎯';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-hero text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-heading font-bold">Community Goals</h1>
          <p className="text-white/90 mt-1">Support friends on their wellness journey</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {goals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <Target className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No shared goals yet</h3>
                <p className="text-muted-foreground">
                  Join communities or ask friends to share their goals for accountability!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          goals.map(goal => {
            const progress = getProgressPercentage(goal);
            const daysLeft = getDaysRemaining(goal.end_date);
            const hasCheered = userCheers.has(goal.id);

            return (
              <Card key={goal.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={goal.owner_avatar} />
                      <AvatarFallback>
                        {goal.owner_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{getGoalIcon(goal.goal_type)}</span>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {goal.owner_name} • {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                      </p>
                      {goal.description && (
                        <CardDescription className="mt-2">{goal.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {goal.current_value} / {goal.target_value} {goal.unit}
                      </span>
                      <span className="font-semibold">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t">
                    <Button
                      variant={hasCheered ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleCheer(goal.id)}
                      className="flex items-center gap-2"
                    >
                      <Heart className={`h-4 w-4 ${hasCheered ? 'fill-current' : ''}`} />
                      {goal.cheer_count > 0 && <span>{goal.cheer_count}</span>}
                      <span>{hasCheered ? 'Cheered' : 'Cheer'}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {goal.comment_count > 0 && <span>{goal.comment_count}</span>}
                      <span>Comment</span>
                    </Button>
                  </div>

                  {selectedGoal === goal.id && (
                    <div className="flex gap-2 pt-2">
                      <Textarea
                        placeholder="Add words of encouragement..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleComment(goal.id)}
                        disabled={!comment.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default SharedGoals;
