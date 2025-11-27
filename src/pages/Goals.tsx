import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/BottomNav";
import { Plus, Target, TrendingUp, Calendar, CheckCircle2, Pause, Archive, Share2, Users } from "lucide-react";
import { CreateGoalDialog } from "@/components/CreateGoalDialog";
import { ShareGoalDialog } from "@/components/ShareGoalDialog";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface Goal {
  id: string;
  goal_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  is_public: boolean;
}

const Goals = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchGoals(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchGoals = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (goalId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('user_goals')
        .update({ current_value: newValue })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.map(g => 
        g.id === goalId ? { ...g, current_value: newValue } : g
      ));
      toast.success('Progress updated!');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const updateGoalStatus = async (goalId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.map(g => 
        g.id === goalId ? { ...g, status: newStatus } : g
      ));
      toast.success(`Goal ${newStatus}!`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.filter(g => g.id !== goalId));
      toast.success('Goal deleted');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const getProgressPercentage = (goal: Goal) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const filterGoalsByStatus = (status: string) => {
    return goals.filter(g => g.status === status);
  };

  const renderGoalCard = (goal: Goal) => {
    const progress = getProgressPercentage(goal);
    const daysLeft = getDaysRemaining(goal.end_date);
    const isCompleted = progress >= 100;

    return (
      <Card key={goal.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getGoalIcon(goal.goal_type)}</span>
              <div>
                <CardTitle className="text-lg">{goal.title}</CardTitle>
                <CardDescription className="mt-1">{goal.description}</CardDescription>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(goal.priority)}`} />
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

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
              </span>
            </div>
            <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
              {goal.status}
            </Badge>
          </div>

          <div className="flex gap-2">
            {!isCompleted && goal.status === 'active' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const increment = goal.target_value / 10;
                    updateGoalProgress(goal.id, Math.min(goal.current_value + increment, goal.target_value));
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateGoalStatus(goal.id, 'paused')}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              </>
            )}
            {isCompleted && goal.status === 'active' && (
              <Button
                size="sm"
                onClick={() => updateGoalStatus(goal.id, 'completed')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            )}
            {goal.status === 'paused' && (
              <Button
                size="sm"
                onClick={() => updateGoalStatus(goal.id, 'active')}
              >
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedGoal(goal);
                setShowShareDialog(true);
              }}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteGoal(goal.id)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your goals...</p>
        </div>
      </div>
    );
  }

  const activeGoals = filterGoalsByStatus('active');
  const completedGoals = filterGoalsByStatus('completed');
  const pausedGoals = filterGoalsByStatus('paused');

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-hero text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">My Goals</h1>
            <p className="text-white/90 mt-1">Set targets and track your progress</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/goals/shared')} 
              variant="outline" 
              className="bg-transparent border-white text-white hover:bg-white/10"
            >
              <Users className="h-5 w-5 mr-2" />
              Community
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-white text-primary hover:bg-white/90">
              <Plus className="h-5 w-5 mr-2" />
              New Goal
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {goals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <Target className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start your wellness journey by setting your first goal
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">
                Active ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedGoals.length})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({pausedGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-6">
              {activeGoals.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">No active goals</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeGoals.map(renderGoalCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-6">
              {completedGoals.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">No completed goals yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedGoals.map(renderGoalCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="paused" className="space-y-4 mt-6">
              {pausedGoals.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">No paused goals</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pausedGoals.map(renderGoalCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <CreateGoalDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await fetchGoals(session.user.id);
          };
          checkAuth();
        }}
      />

      {selectedGoal && (
        <ShareGoalDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          goalId={selectedGoal.id}
          currentIsPublic={selectedGoal.is_public}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Goals;
