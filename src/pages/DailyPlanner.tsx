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
import { StatsCardSkeleton, ActivityCardSkeleton } from "@/components/skeletons";
import { MotionHeader, MotionFadeIn, MotionList, MotionItem, MotionSection } from "@/components/motion/MotionWrappers";

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
      <MotionHeader className="bg-gradient-hero text-white p-3 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-3xl font-heading font-bold">Daily Planner</h1>
          <p className="text-white/90 mt-0.5 sm:mt-1 text-xs sm:text-base">
            {format(selectedDate, "EEE, MMM d, yyyy")}
          </p>
        </div>
      </MotionHeader>

      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
        {/* Stats Cards */}
        <MotionList className="grid grid-cols-4 gap-2 sm:gap-4" delay={0.1}>
          <MotionItem>
            <Card className="active:scale-[0.98] transition-transform">
              <CardContent className="p-2.5 sm:p-4">
                <div className="text-base sm:text-2xl font-bold">{stats.completed}/{stats.total}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Done</p>
              </CardContent>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
              onClick={() => navigate("/workouts")}
            >
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Dumbbell className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                  <div className="text-base sm:text-2xl font-bold">{stats.workout}</div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Workouts</p>
              </CardContent>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="active:scale-[0.98] transition-transform">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Heart className="h-3 w-3 sm:h-5 sm:w-5 text-secondary" />
                  <div className="text-base sm:text-2xl font-bold">{stats.meditation}</div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Meditate</p>
              </CardContent>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="active:scale-[0.98] transition-transform">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Apple className="h-3 w-3 sm:h-5 sm:w-5 text-accent" />
                  <div className="text-base sm:text-2xl font-bold">{stats.nutrition}</div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Nutrition</p>
              </CardContent>
            </Card>
          </MotionItem>
        </MotionList>

        <MotionFadeIn delay={0.2} className="grid gap-3 sm:gap-6 lg:grid-cols-3">
          {/* Calendar - Hidden on mobile, shown as compact on larger screens */}
          <Card className="hidden sm:block">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardTitle className="font-heading flex items-center gap-2 text-sm sm:text-lg">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border mx-auto"
              />
            </CardContent>
          </Card>

          {/* Mobile Date Picker */}
          <Card className="sm:hidden">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                >
                  ←
                </Button>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{format(selectedDate, "EEE, MMM d")}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                >
                  →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activities List */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-heading text-sm sm:text-lg">Activities</CardTitle>
                <div className="flex gap-1.5 sm:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateAIRecommendations}
                    disabled={generatingAI}
                    className="h-8 sm:h-9 text-xs px-2.5 sm:px-3"
                  >
                    {generatingAI ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span className="ml-1">AI</span>
                  </Button>
                  <AddActivityDialog 
                    selectedDate={selectedDate}
                    onActivityAdded={() => fetchActivities(selectedDate)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-2 sm:space-y-3">
              {loading ? (
                <div className="space-y-2 sm:space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ActivityCardSkeleton key={i} />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs sm:text-base">No activities for today</p>
                  <p className="text-[10px] sm:text-sm mt-1">Tap AI to get recommendations!</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-start gap-2 p-2.5 sm:p-4 rounded-xl border transition-all active:scale-[0.99]",
                      activity.completed ? "bg-muted/50" : "bg-card hover:bg-accent/5"
                    )}
                  >
                    <Checkbox
                      checked={activity.completed}
                      onCheckedChange={() => toggleComplete(activity)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getActivityIcon(activity.activity_type)}
                        <h3 className={cn(
                          "font-medium text-xs sm:text-base truncate flex-1",
                          activity.completed && "line-through text-muted-foreground"
                        )}>
                          {activity.title}
                        </h3>
                        {activity.is_ai_recommended && (
                          <Badge variant="secondary" className="text-[9px] sm:text-xs px-1 py-0">
                            <Sparkles className="h-2 w-2 mr-0.5" />
                            AI
                          </Badge>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        {activity.scheduled_time && (
                          <span>{activity.scheduled_time}</span>
                        )}
                        {activity.duration_minutes && (
                          <span>{activity.duration_minutes}m</span>
                        )}
                        <span className={getPriorityColor(activity.priority)}>
                          {activity.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </MotionFadeIn>
      </main>

      <BottomNav />
    </div>
  );
};

export default DailyPlanner;
