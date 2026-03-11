import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Loader2, Play, Pause, Check, X, ChevronLeft, 
  Timer, Dumbbell, RotateCcw, Trophy, Clock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ExerciseDemo from "@/components/ExerciseDemo";
import { useGamification } from "@/hooks/useGamification";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_groups: string[];
  instructions: string;
  video_url: string | null;
  thumbnail_url: string | null;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise: Exercise;
}

interface Workout {
  id: string;
  name: string;
  description: string | null;
  difficulty_level: string;
  category: string;
  total_duration_minutes: number | null;
  workout_exercises: WorkoutExercise[];
}

interface SetLog {
  setNumber: number;
  repsCompleted: number;
  weightUsed: number;
  completed: boolean;
  completedAt: string | null;
}

interface ExerciseProgress {
  workoutExerciseId: string;
  exerciseId: string;
  sets: SetLog[];
}

const WorkoutSession = () => {
  const navigate = useNavigate();
  const { id: workoutId } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<Map<string, ExerciseProgress>>(new Map());
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Gamification hook
  const { awardPoints, checkAchievements } = useGamification(userId);

  useEffect(() => {
    checkUserAndLoadWorkout();
  }, [workoutId]);

  // Main timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && !isResting) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isResting]);

  // Rest timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTime > 0) {
      interval = setInterval(() => {
        setRestTime(prev => {
          if (prev <= 1) {
            setIsResting(false);
            toast.success("Rest complete! Ready for next set.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  const checkUserAndLoadWorkout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await loadWorkout();
  };

  const loadWorkout = async () => {
    if (!workoutId) {
      navigate("/workouts");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          id, name, description, difficulty_level, category, total_duration_minutes,
          workout_exercises (
            id, exercise_id, order_index, sets, reps, duration_seconds, rest_seconds, notes,
            exercise:exercises (id, name, description, muscle_groups, instructions, video_url, thumbnail_url)
          )
        `)
        .eq("id", workoutId)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error("Workout not found");
        navigate("/workouts");
        return;
      }

      // Sort exercises by order_index
      const sortedExercises = (data.workout_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((we: any) => ({
          ...we,
          exercise: we.exercise as Exercise
        }));

      setWorkout({ ...data, workout_exercises: sortedExercises });
      await startSession(data.id);
      initializeProgress(sortedExercises);
    } catch (error) {
      console.error("Error loading workout:", error);
      toast.error("Failed to load workout");
      navigate("/workouts");
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (workoutId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: session.user.id,
        workout_id: workoutId,
        status: "in_progress"
      })
      .select()
      .single();

    if (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start workout session");
      return;
    }

    setSessionId(data.id);
  };

  const initializeProgress = (exercises: WorkoutExercise[]) => {
    const progressMap = new Map<string, ExerciseProgress>();
    
    exercises.forEach(we => {
      const numSets = we.sets || 3;
      const sets: SetLog[] = Array.from({ length: numSets }, (_, i) => ({
        setNumber: i + 1,
        repsCompleted: we.reps || 0,
        weightUsed: 0,
        completed: false,
        completedAt: null
      }));
      
      progressMap.set(we.id, {
        workoutExerciseId: we.id,
        exerciseId: we.exercise_id,
        sets
      });
    });
    
    setExerciseProgress(progressMap);
  };

  const currentExercise = workout?.workout_exercises[currentExerciseIndex];
  const currentProgress = currentExercise ? exerciseProgress.get(currentExercise.id) : null;

  const updateSetValue = (setIndex: number, field: 'repsCompleted' | 'weightUsed', value: number) => {
    if (!currentExercise) return;
    
    setExerciseProgress(prev => {
      const updated = new Map(prev);
      const progress = updated.get(currentExercise.id);
      if (progress) {
        const newSets = [...progress.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        updated.set(currentExercise.id, { ...progress, sets: newSets });
      }
      return updated;
    });
  };

  const completeSet = async (setIndex: number) => {
    if (!currentExercise || !sessionId) return;
    
    setExerciseProgress(prev => {
      const updated = new Map(prev);
      const progress = updated.get(currentExercise.id);
      if (progress) {
        const newSets = [...progress.sets];
        newSets[setIndex] = { 
          ...newSets[setIndex], 
          completed: true, 
          completedAt: new Date().toISOString() 
        };
        updated.set(currentExercise.id, { ...progress, sets: newSets });
      }
      return updated;
    });

    // Save to database
    const progress = exerciseProgress.get(currentExercise.id);
    if (progress) {
      const setLog = progress.sets[setIndex];
      await supabase.from("workout_session_logs").insert({
        session_id: sessionId,
        workout_exercise_id: currentExercise.id,
        exercise_id: currentExercise.exercise_id,
        set_number: setIndex + 1,
        reps_completed: setLog.repsCompleted,
        weight_used: setLog.weightUsed || null,
        completed: true,
        completed_at: new Date().toISOString()
      });
    }

    // Start rest timer if not last set
    if (currentExercise.rest_seconds && setIndex < (currentExercise.sets || 3) - 1) {
      setRestTime(currentExercise.rest_seconds);
      setIsResting(true);
    }

    toast.success(`Set ${setIndex + 1} complete!`);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTime(0);
  };

  const nextExercise = () => {
    if (workout && currentExerciseIndex < workout.workout_exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setIsResting(false);
      setRestTime(0);
    } else {
      setShowCompleteDialog(true);
    }
  };

  const prevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setIsResting(false);
      setRestTime(0);
    }
  };

  const completeWorkout = async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from("workout_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_duration_seconds: elapsedTime,
          notes: sessionNotes || null
        })
        .eq("id", sessionId);

      // Update user_custom_workouts for tracking
      if (userId && workoutId) {
        const { data: existing } = await supabase
          .from("user_custom_workouts")
          .select("id, completion_count")
          .eq("user_id", userId)
          .eq("workout_id", workoutId)
          .single();

        if (existing) {
          await supabase
            .from("user_custom_workouts")
            .update({
              completion_count: (existing.completion_count || 0) + 1,
              last_completed_at: new Date().toISOString()
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("user_custom_workouts")
            .insert({
              user_id: userId,
              workout_id: workoutId,
              completion_count: 1,
              last_completed_at: new Date().toISOString()
            });
        }
      }

      // Award points for completing workout
      const workoutMinutes = Math.floor(elapsedTime / 60);
      const basePoints = 50; // Base points for completing any workout
      const durationBonus = Math.min(workoutMinutes * 2, 50); // Up to 50 bonus points based on duration
      const totalPoints = basePoints + durationBonus;
      
      await awardPoints(
        totalPoints,
        'workout',
        `Completed workout: ${workout?.name || 'Workout'}`,
        sessionId,
        'workout_session'
      );
      
      // Check for new achievements
      await checkAchievements();

      toast.success("Workout completed! Great job! 🎉");
      navigate(`/workouts/${workoutId}`);
    } catch (error) {
      console.error("Error completing workout:", error);
      toast.error("Failed to save workout");
    }
  };

  const cancelWorkout = async () => {
    if (sessionId) {
      await supabase
        .from("workout_sessions")
        .update({ status: "cancelled" })
        .eq("id", sessionId);
    }
    navigate(`/workouts/${workoutId}`);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCompletedSetsCount = () => {
    let completed = 0;
    let total = 0;
    exerciseProgress.forEach(progress => {
      progress.sets.forEach(set => {
        total++;
        if (set.completed) completed++;
      });
    });
    return { completed, total };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workout || !currentExercise) {
    return null;
  }

  const { completed: completedSets, total: totalSets } = getCompletedSetsCount();
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setShowCancelDialog(true)}>
              <X className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium">{workout.name}</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Timer className="h-3 w-3" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{completedSets}/{totalSets} sets</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </div>

      {/* Rest Timer Overlay */}
      {isResting && (
        <div className="fixed inset-0 z-20 bg-background/95 flex items-center justify-center">
          <div className="text-center space-y-6">
            <Clock className="h-16 w-16 text-primary mx-auto animate-pulse" />
            <div>
              <p className="text-sm text-muted-foreground">Rest Time</p>
              <p className="text-6xl font-bold text-primary">{formatTime(restTime)}</p>
            </div>
            <Button onClick={skipRest} variant="outline" size="lg">
              Skip Rest
            </Button>
          </div>
        </div>
      )}

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Exercise Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={prevExercise}
            disabled={currentExerciseIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Badge variant="outline">
            {currentExerciseIndex + 1} / {workout.workout_exercises.length}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={nextExercise}
          >
            {currentExerciseIndex === workout.workout_exercises.length - 1 ? 'Finish' : 'Next'}
            {currentExerciseIndex < workout.workout_exercises.length - 1 && (
              <ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
            )}
          </Button>
        </div>

        {/* Current Exercise Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{currentExercise.exercise.name}</CardTitle>
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentExercise.exercise.muscle_groups.slice(0, 3).map((group, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>
              <Dumbbell className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Exercise Demo Video/GIF */}
            <ExerciseDemo
              videoUrl={currentExercise.exercise.video_url}
              thumbnailUrl={currentExercise.exercise.thumbnail_url}
              exerciseName={currentExercise.exercise.name}
              autoPlay={true}
            />

            {currentExercise.exercise.description && (
              <p className="text-sm text-muted-foreground">
                {currentExercise.exercise.description}
              </p>
            )}
            
            {/* Target */}
            <div className="flex gap-4 text-sm p-3 bg-muted/50 rounded-lg">
              <div>
                <span className="text-muted-foreground">Target: </span>
                <span className="font-medium">{currentExercise.sets || 3} sets</span>
              </div>
              {currentExercise.reps && (
                <div>
                  <span className="text-muted-foreground">× </span>
                  <span className="font-medium">{currentExercise.reps} reps</span>
                </div>
              )}
              {currentExercise.rest_seconds && (
                <div>
                  <span className="text-muted-foreground">Rest: </span>
                  <span className="font-medium">{currentExercise.rest_seconds}s</span>
                </div>
              )}
            </div>

            {currentExercise.notes && (
              <p className="text-xs text-muted-foreground italic">
                Note: {currentExercise.notes}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sets Logging */}
        <div className="space-y-3">
          <h3 className="font-medium">Log Your Sets</h3>
          {currentProgress?.sets.map((set, index) => (
            <Card 
              key={index} 
              className={`transition-all ${set.completed ? 'bg-green-500/10 border-green-500/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <Input
                        type="number"
                        value={set.repsCompleted}
                        onChange={(e) => updateSetValue(index, 'repsCompleted', parseInt(e.target.value) || 0)}
                        disabled={set.completed}
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Weight (kg)</label>
                      <Input
                        type="number"
                        value={set.weightUsed || ''}
                        onChange={(e) => updateSetValue(index, 'weightUsed', parseFloat(e.target.value) || 0)}
                        disabled={set.completed}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <Button
                    size="icon"
                    variant={set.completed ? "secondary" : "default"}
                    onClick={() => !set.completed && completeSet(index)}
                    disabled={set.completed}
                    className="h-10 w-10"
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete Button */}
        {currentExerciseIndex === workout.workout_exercises.length - 1 && (
          <Button 
            className="w-full h-12" 
            size="lg"
            onClick={() => setShowCompleteDialog(true)}
          >
            <Trophy className="mr-2 h-5 w-5" />
            Complete Workout
          </Button>
        )}
      </div>

      {/* Complete Workout Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Complete Workout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{formatTime(elapsedTime)}</p>
              <p className="text-sm text-muted-foreground">Total Time</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold">{completedSets}</p>
                <p className="text-xs text-muted-foreground">Sets Completed</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold">{workout.workout_exercises.length}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="How did this workout feel?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Continue Workout
            </Button>
            <Button onClick={completeWorkout}>
              <Check className="mr-2 h-4 w-4" />
              Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Workout Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Workout?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to end this workout? Your progress will be saved but marked as cancelled.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Continue Workout
            </Button>
            <Button variant="destructive" onClick={cancelWorkout}>
              End Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutSession;
