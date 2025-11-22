import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Heart, 
  Apple, 
  Users,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { AddActivityDialog } from "@/components/AddActivityDialog";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  activity_type: "workout" | "meditation" | "nutrition" | "social" | "custom";
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  completed: boolean;
  is_ai_recommended: boolean;
  priority: "low" | "medium" | "high";
};

const DailyPlanner = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchActivities(selectedDate);
  }, [selectedDate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchActivities = async (date: Date) => {
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from("daily_activities")
      .select("*")
      .eq("scheduled_date", dateStr)
      .order("scheduled_time", { ascending: true });

    if (error) {
      toast.error("Failed to fetch activities");
      console.error(error);
    } else {
      setActivities((data || []) as Activity[]);
    }
    setLoading(false);
  };

  const toggleComplete = async (activity: Activity) => {
    const { error } = await supabase
      .from("daily_activities")
      .update({ 
        completed: !activity.completed,
        completed_at: !activity.completed ? new Date().toISOString() : null
      })
      .eq("id", activity.id);

    if (error) {
      toast.error("Failed to update activity");
    } else {
      setActivities(activities.map(a => 
        a.id === activity.id 
          ? { ...a, completed: !a.completed }
          : a
      ));
      toast.success(activity.completed ? "Activity marked incomplete" : "Activity completed!");
    }
  };

  const generateAIRecommendations = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-activity-recommendations',
        {
          body: { date: format(selectedDate, "yyyy-MM-dd") }
        }
      );

      if (error) throw error;

      const recommendations = data.recommendations;
      
      // Insert recommendations into database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const activitiesToInsert = recommendations.map((rec: any) => ({
        user_id: user.id,
        title: rec.title,
        description: rec.description,
        activity_type: rec.activity_type,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        scheduled_time: rec.scheduled_time || null,
        duration_minutes: rec.duration_minutes,
        priority: rec.priority,
        is_ai_recommended: true,
      }));

      const { error: insertError } = await supabase
        .from("daily_activities")
        .insert(activitiesToInsert);

      if (insertError) throw insertError;

      toast.success(`Added ${recommendations.length} AI-recommended activities!`);
      fetchActivities(selectedDate);
      
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");
    } finally {
      setGeneratingAI(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "workout": return <Dumbbell className="h-4 w-4" />;
      case "meditation": return <Heart className="h-4 w-4" />;
      case "nutrition": return <Apple className="h-4 w-4" />;
      case "social": return <Users className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-orange-500";
      case "low": return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const stats = {
    total: activities.length,
    completed: activities.filter(a => a.completed).length,
    workout: activities.filter(a => a.activity_type === "workout").length,
    meditation: activities.filter(a => a.activity_type === "meditation").length,
    nutrition: activities.filter(a => a.activity_type === "nutrition").length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-heading font-bold">Daily Planner</h1>
          <p className="text-white/90 mt-1">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.completed}/{stats.total}</div>
              <p className="text-xs text-muted-foreground">Tasks Completed</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/workouts")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{stats.workout}</div>
              </div>
              <p className="text-xs text-muted-foreground">Workouts • Browse Library</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-secondary" />
                <div className="text-2xl font-bold">{stats.meditation}</div>
              </div>
              <p className="text-xs text-muted-foreground">Meditation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5 text-accent" />
                <div className="text-2xl font-bold">{stats.nutrition}</div>
              </div>
              <p className="text-xs text-muted-foreground">Nutrition</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Activities List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading">Today's Activities</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateAIRecommendations}
                    disabled={generatingAI}
                  >
                    {generatingAI ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AI Suggest
                  </Button>
                  <AddActivityDialog 
                    selectedDate={selectedDate}
                    onActivityAdded={() => fetchActivities(selectedDate)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No activities scheduled for this day</p>
                  <p className="text-sm mt-2">Try generating AI recommendations!</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                      activity.completed ? "bg-muted/50" : "bg-card hover:bg-accent/5"
                    )}
                  >
                    <Checkbox
                      checked={activity.completed}
                      onCheckedChange={() => toggleComplete(activity)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.activity_type)}
                        <h3 className={cn(
                          "font-medium",
                          activity.completed && "line-through text-muted-foreground"
                        )}>
                          {activity.title}
                        </h3>
                        {activity.is_ai_recommended && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {activity.scheduled_time && (
                          <span>{activity.scheduled_time}</span>
                        )}
                        {activity.duration_minutes && (
                          <span>{activity.duration_minutes} min</span>
                        )}
                        <span className={getPriorityColor(activity.priority)}>
                          {activity.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default DailyPlanner;
