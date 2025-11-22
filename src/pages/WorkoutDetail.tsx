import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Play, Heart, Clock, Dumbbell } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

interface WorkoutWithExercises {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  category: string;
  total_duration_minutes: number;
  image_url: string | null;
  workout_exercises: Array<{
    id: string;
    order_index: number;
    sets: number | null;
    reps: number | null;
    duration_seconds: number | null;
    rest_seconds: number | null;
    notes: string | null;
    exercises: {
      id: string;
      name: string;
      description: string;
      instructions: string;
      video_url: string | null;
      thumbnail_url: string | null;
      muscle_groups: string[];
    };
  }>;
}

const WorkoutDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchWorkout();
  }, [id]);

  const checkUserAndFetchWorkout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    await fetchWorkout();
    await checkFavorite(session.user.id);
  };

  const fetchWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_exercises (
            id,
            order_index,
            sets,
            reps,
            duration_seconds,
            rest_seconds,
            notes,
            exercises (
              id,
              name,
              description,
              instructions,
              video_url,
              thumbnail_url,
              muscle_groups
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Sort exercises by order_index
      if (data.workout_exercises) {
        data.workout_exercises.sort((a, b) => a.order_index - b.order_index);
      }
      
      setWorkout(data);
    } catch (error) {
      console.error("Error fetching workout:", error);
      toast.error("Failed to load workout");
      navigate("/workouts");
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async (uid: string) => {
    const { data } = await supabase
      .from("user_custom_workouts")
      .select("is_favorite")
      .eq("user_id", uid)
      .eq("workout_id", id)
      .single();
    
    setIsFavorite(data?.is_favorite || false);
  };

  const toggleFavorite = async () => {
    if (!userId) return;

    try {
      const { data: existing } = await supabase
        .from("user_custom_workouts")
        .select("id, is_favorite")
        .eq("user_id", userId)
        .eq("workout_id", id)
        .single();

      if (existing) {
        await supabase
          .from("user_custom_workouts")
          .update({ is_favorite: !existing.is_favorite })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_custom_workouts")
          .insert({ user_id: userId, workout_id: id, is_favorite: true });
      }

      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites");
    }
  };

  const startWorkout = () => {
    toast.success("Starting workout session...");
    // TODO: Implement workout session tracking
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Workout not found</p>
      </div>
    );
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/10 text-green-500";
      case "intermediate": return "bg-yellow-500/10 text-yellow-500";
      case "advanced": return "bg-red-500/10 text-red-500";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <Button variant="ghost" onClick={() => navigate("/workouts")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>

        {/* Workout Header */}
        <Card>
          <CardHeader>
            {workout.image_url && (
              <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                <img src={workout.image_url} alt={workout.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{workout.name}</CardTitle>
                <CardDescription>{workout.description}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleFavorite}>
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className={getDifficultyColor(workout.difficulty_level)}>
                {workout.difficulty_level}
              </Badge>
              <Badge variant="outline">{workout.category}</Badge>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {workout.total_duration_minutes} min
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={startWorkout} size="lg" className="w-full">
              <Play className="mr-2 h-5 w-5" />
              Start Workout
            </Button>
          </CardContent>
        </Card>

        {/* Exercise List */}
        <Card>
          <CardHeader>
            <CardTitle>Exercises ({workout.workout_exercises?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workout.workout_exercises?.map((we, index) => (
              <div key={we.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 h-20 bg-muted rounded-lg overflow-hidden">
                    {we.exercises.thumbnail_url ? (
                      <img src={we.exercises.thumbnail_url} alt={we.exercises.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{index + 1}. {we.exercises.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {we.exercises.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {we.sets && we.reps && (
                        <Badge variant="secondary">{we.sets} sets × {we.reps} reps</Badge>
                      )}
                      {we.duration_seconds && (
                        <Badge variant="secondary">{Math.floor(we.duration_seconds / 60)} min</Badge>
                      )}
                      {we.rest_seconds && (
                        <Badge variant="outline">Rest: {we.rest_seconds}s</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {we.exercises.muscle_groups.map((group, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {group}
                        </Badge>
                      ))}
                    </div>
                    {we.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        Note: {we.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default WorkoutDetail;
