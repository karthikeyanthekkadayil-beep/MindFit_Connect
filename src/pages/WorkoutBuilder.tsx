import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, X, Search, GripVertical } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { MotionFadeIn } from "@/components/motion/MotionWrappers";

interface Exercise {
  id: string;
  name: string;
  description: string;
  muscle_groups: string[];
  difficulty_level: string;
}

interface WorkoutExercise extends Exercise {
  sets: number;
  reps: number;
  duration_seconds: number;
  rest_seconds: number;
  notes: string;
}

const WorkoutBuilder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("intermediate");
  const [category, setCategory] = useState("strength");

  useEffect(() => {
    checkUserAndFetchExercises();
  }, []);

  const checkUserAndFetchExercises = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    fetchExercises();
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, description, muscle_groups, difficulty_level")
        .order("name");

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Failed to load exercises");
    }
  };

  const addExerciseToWorkout = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      ...exercise,
      sets: 3,
      reps: 12,
      duration_seconds: 0,
      rest_seconds: 60,
      notes: "",
    };
    setSelectedExercises([...selectedExercises, newExercise]);
    setShowExerciseDialog(false);
    setSearchQuery("");
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedExercises.length) return;

    const updated = [...selectedExercises];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSelectedExercises(updated);
  };

  const saveWorkout = async () => {
    if (!userId) return;
    if (!workoutName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }
    if (selectedExercises.length === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    setLoading(true);
    try {
      const totalDuration = selectedExercises.reduce((acc, ex) => 
        acc + (ex.duration_seconds || (ex.sets * ex.reps * 3)) / 60, 0
      );

      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          name: workoutName,
          description: workoutDescription,
          difficulty_level: difficultyLevel,
          category,
          total_duration_minutes: Math.ceil(totalDuration),
          created_by: userId,
          is_public: false,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      const workoutExercises = selectedExercises.map((ex, index) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        order_index: index,
        sets: ex.sets,
        reps: ex.reps,
        duration_seconds: ex.duration_seconds || null,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes || null,
      }));

      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(workoutExercises);

      if (exercisesError) throw exercisesError;

      toast.success("Workout created successfully!");
      navigate(`/workouts/${workout.id}`);
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to create workout");
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/workouts")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Custom Workout</CardTitle>
            <CardDescription>Build a personalized workout routine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workout Name *</Label>
              <Input
                id="name"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="My Custom Workout"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={workoutDescription}
                onChange={(e) => setWorkoutDescription(e.target.value)}
                placeholder="Describe your workout..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Exercises ({selectedExercises.length})</CardTitle>
                <CardDescription>Add and configure exercises for your workout</CardDescription>
              </div>
              <Button onClick={() => setShowExerciseDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Exercise
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedExercises.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No exercises added yet. Click "Add Exercise" to get started.
              </p>
            ) : (
              selectedExercises.map((exercise, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveExercise(index, "up")}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{index + 1}. {exercise.name}</h3>
                            <p className="text-sm text-muted-foreground">{exercise.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {exercise.muscle_groups.map((group, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{group}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExercise(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.sets}
                              onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.reps}
                              onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rest (sec)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={exercise.rest_seconds}
                              onChange={(e) => updateExercise(index, "rest_seconds", parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Notes (optional)</Label>
                          <Input
                            value={exercise.notes}
                            onChange={(e) => updateExercise(index, "notes", e.target.value)}
                            placeholder="Add any special instructions..."
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/workouts")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={saveWorkout}
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Workout
          </Button>
        </div>
      </div>

      <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
            <DialogDescription>
              Select an exercise to add to your workout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredExercises.map((exercise) => (
                <Card
                  key={exercise.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addExerciseToWorkout(exercise)}
                >
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{exercise.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {exercise.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exercise.muscle_groups.slice(0, 3).map((group, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge className="ml-2">{exercise.difficulty_level}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredExercises.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No exercises found
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default WorkoutBuilder;
