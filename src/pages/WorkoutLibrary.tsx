import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, InteractiveCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Loader2, Search, Dumbbell, Heart, Plus, Flame, Zap, Target,
  ChevronRight, Clock, Calendar, ArrowLeft, Play, CheckCircle2, Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import PersonalizedWorkouts from "@/components/PersonalizedWorkouts";
import { MotionFadeIn, MotionSection, MotionList, MotionItem } from "@/components/motion/MotionWrappers";
import { ExerciseAnimationDemo } from "@/components/ExerciseAnimationDemo";
import { HOME_WORKOUT_SPLITS, type WorkoutSplit, type WorkoutDay, type ExerciseItem } from "@/data/workoutSplits";

const SPLIT_ICONS: Record<string, React.ElementType> = {
  zap: Zap,
  flame: Flame,
  target: Target,
  dumbbell: Dumbbell,
};

interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  muscle_groups: string[];
  duration_minutes: number;
  thumbnail_url: string | null;
}

interface Workout {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  category: string;
  total_duration_minutes: number;
  image_url: string | null;
}

const WorkoutLibrary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("fitness_level")
      .eq("id", session.user.id)
      .single();
    
    setUserProfile(profile);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [exercisesResult, workoutsResult] = await Promise.all([
        supabase.from("exercises").select("*").order("name"),
        supabase.from("workouts").select("*").order("name"),
      ]);

      if (exercisesResult.error) throw exercisesResult.error;
      if (workoutsResult.error) throw workoutsResult.error;

      setExercises(exercisesResult.data || []);
      setWorkouts(workoutsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load workout library");
    } finally {
      setLoading(false);
    }
  };

  const filterByDifficulty = (items: any[]) => {
    if (difficultyFilter === "all") return items;
    return items.filter(item => item.difficulty_level === difficultyFilter);
  };

  const filterBySearch = (items: any[]) => {
    if (!searchQuery) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredExercises = filterBySearch(filterByDifficulty(exercises));
  const filteredWorkouts = filterBySearch(filterByDifficulty(workouts));

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/10 text-green-500";
      case "intermediate": return "bg-yellow-500/10 text-yellow-500";
      case "advanced": return "bg-red-500/10 text-red-500";
      default: return "bg-muted";
    }
  };

  const getDifficultyBadge = (level: string) => {
    switch (level) {
      case "beginner": return "border-green-500/30 text-green-600 bg-green-500/5";
      case "intermediate": return "border-yellow-500/30 text-yellow-600 bg-yellow-500/5";
      case "advanced": return "border-red-500/30 text-red-600 bg-red-500/5";
      default: return "";
    }
  };

  // Exercise detail view within a day
  if (selectedDay && selectedSplit) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDay(null)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{selectedDay.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedDay.focus} • {selectedDay.estimatedMinutes} min</p>
            </div>
          </motion.div>

          {/* Exercise list */}
          <div className="space-y-3">
            {selectedDay.exercises.map((exercise, index) => (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
              >
                <Card 
                  className={`overflow-hidden cursor-pointer transition-all duration-300 ${
                    expandedExercise === exercise.id ? 'ring-2 ring-primary/30' : ''
                  }`}
                  onClick={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                      {/* Exercise number */}
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {index + 1}
                      </div>

                      {/* Animation preview */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                        <ExerciseAnimationDemo exerciseId={exercise.animationId} className="w-full h-full !aspect-square rounded-lg" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{exercise.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">{exercise.sets} sets × {exercise.reps}</span>
                          <span className="text-xs text-muted-foreground">• {exercise.restSeconds}s rest</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {exercise.muscleGroups.slice(0, 2).map((g) => (
                            <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0">{g}</Badge>
                          ))}
                        </div>
                      </div>

                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                        expandedExercise === exercise.id ? 'rotate-90' : ''
                      }`} />
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {expandedExercise === exercise.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t pt-3">
                            {/* Larger animation */}
                            <div className="w-full max-w-[200px] mx-auto">
                              <ExerciseAnimationDemo exerciseId={exercise.animationId} className="w-full" />
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Instructions</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{exercise.instructions}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-muted/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-primary">{exercise.sets}</p>
                                <p className="text-[10px] text-muted-foreground">Sets</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-primary">{exercise.reps}</p>
                                <p className="text-[10px] text-muted-foreground">Reps</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-primary">{exercise.restSeconds}s</p>
                                <p className="text-[10px] text-muted-foreground">Rest</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split detail view (day selection)
  if (selectedSplit) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSplit(null)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{selectedSplit.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedSplit.description}</p>
            </div>
          </motion.div>

          {/* Split info */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-2"
          >
            <Card className="text-center">
              <CardContent className="p-3">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{selectedSplit.daysPerWeek}</p>
                <p className="text-xs text-muted-foreground">Days/Week</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3">
                <Dumbbell className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{selectedSplit.days.reduce((t, d) => t + d.exercises.length, 0)}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3">
                <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                <Badge variant="outline" className={`text-[10px] mt-1 ${getDifficultyBadge(selectedSplit.difficulty)}`}>
                  {selectedSplit.difficulty}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>

          {/* Days */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Training Days</h2>
            <div className="space-y-3">
              {selectedSplit.days.map((day, index) => (
                <motion.div
                  key={day.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                >
                  <InteractiveCard 
                    className="cursor-pointer"
                    onClick={() => setSelectedDay(day)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedSplit.color} flex items-center justify-center`}>
                            <span className="text-lg font-bold text-primary">D{index + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{day.name}</h3>
                            <p className="text-sm text-muted-foreground">{day.focus}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Dumbbell className="h-3 w-3" />
                                {day.exercises.length} exercises
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {day.estimatedMinutes} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Mini exercise preview */}
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                        {day.exercises.slice(0, 4).map((ex) => (
                          <div key={ex.id} className="shrink-0 w-12 h-12">
                            <ExerciseAnimationDemo exerciseId={ex.animationId} className="w-full h-full !aspect-square rounded-md text-xs" />
                          </div>
                        ))}
                        {day.exercises.length > 4 && (
                          <div className="shrink-0 w-12 h-12 rounded-md bg-muted/50 flex items-center justify-center text-xs text-muted-foreground font-medium">
                            +{day.exercises.length - 4}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </InteractiveCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Weekly schedule suggestion */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Suggested Weekly Schedule
              </h3>
              <div className="flex gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                  const isTraining = i < selectedSplit.daysPerWeek;
                  const dayIndex = isTraining ? i % selectedSplit.days.length : -1;
                  return (
                    <div 
                      key={day}
                      className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                        isTraining 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <p className="text-[10px] mb-0.5">{day}</p>
                      <p className="font-bold">
                        {isTraining ? `D${dayIndex + 1}` : 'Rest'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">
        <MotionFadeIn className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Workout Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Home workouts • No equipment needed
            </p>
          </div>
          <Button 
            onClick={() => navigate("/workouts/builder")}
            className="w-full sm:w-auto h-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Button>
        </MotionFadeIn>

        {/* Home Workout Splits Section */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Home Workout Splits
          </h2>
          <p className="text-sm text-muted-foreground mb-4">No equipment needed — train anywhere, anytime</p>
          
          <MotionList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" delay={0.05}>
            {HOME_WORKOUT_SPLITS.map((split, index) => {
              const IconComp = SPLIT_ICONS[split.icon] || Dumbbell;
              return (
                <MotionItem key={split.id}>
                  <InteractiveCard 
                    className="cursor-pointer overflow-hidden group"
                    onClick={() => setSelectedSplit(split)}
                  >
                    {/* Gradient header */}
                    <div className={`h-24 sm:h-28 bg-gradient-to-br ${split.color} relative overflow-hidden flex items-center justify-center`}>
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'radial-gradient(circle at 30% 50%, currentColor 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                      }} />
                      <IconComp className="h-12 w-12 text-primary/60 group-hover:scale-110 transition-transform duration-300" />
                      
                      {/* Difficulty badge */}
                      <Badge 
                        variant="outline" 
                        className={`absolute top-2 right-2 text-[10px] ${getDifficultyBadge(split.difficulty)}`}
                      >
                        {split.difficulty}
                      </Badge>
                    </div>

                    <CardContent className="p-3 sm:p-4">
                      <h3 className="font-bold text-base sm:text-lg mb-1">{split.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">{split.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {split.daysPerWeek}x/week
                        </span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {split.days.reduce((t, d) => t + d.exercises.length, 0)} exercises
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {split.days[0]?.estimatedMinutes}m
                        </span>
                      </div>

                      {/* Mini animation previews */}
                      <div className="flex gap-1.5 mt-3">
                        {split.days[0]?.exercises.slice(0, 5).map((ex) => (
                          <div key={ex.id} className="w-9 h-9 shrink-0">
                            <ExerciseAnimationDemo exerciseId={ex.animationId} className="w-full h-full !aspect-square rounded text-[8px]" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </InteractiveCard>
                </MotionItem>
              );
            })}
          </MotionList>
        </section>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises and workouts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Filter by difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI-Powered Personalized Recommendations */}
        <PersonalizedWorkouts />

        {/* Content Tabs */}
        <Tabs defaultValue="workouts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="workouts" className="text-xs sm:text-sm px-2">
              <Dumbbell className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Workouts</span> ({filteredWorkouts.length})
            </TabsTrigger>
            <TabsTrigger value="exercises" className="text-xs sm:text-sm px-2">
              <Heart className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Exercises</span> ({filteredExercises.length})
            </TabsTrigger>
          </TabsList>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-3 mt-3">
            {filteredWorkouts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No workouts found. Try adjusting your filters.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {filteredWorkouts.map((workout) => (
                  <InteractiveCard 
                    key={workout.id} 
                    className="cursor-pointer"
                    onClick={() => navigate(`/workouts/${workout.id}`)}
                  >
                    <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
                      <div className="aspect-video bg-muted rounded-md sm:rounded-lg mb-1 sm:mb-2 overflow-hidden">
                        {workout.image_url ? (
                          <img src={workout.image_url} alt={workout.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-6 sm:h-12 w-6 sm:w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-start gap-1">
                        <CardTitle className="text-xs sm:text-lg line-clamp-1">{workout.name}</CardTitle>
                        <Badge className={`${getDifficultyColor(workout.difficulty_level)} text-[9px] sm:text-xs shrink-0 px-1 sm:px-2 py-0`}>
                          <span className="sm:hidden">{workout.difficulty_level.charAt(0).toUpperCase()}</span>
                          <span className="hidden sm:inline">{workout.difficulty_level}</span>
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-[10px] sm:text-sm hidden sm:block">
                        {workout.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 pt-0">
                      <div className="flex justify-between items-center text-[10px] sm:text-sm text-muted-foreground">
                        <span>{workout.total_duration_minutes}m</span>
                        <Badge variant="outline" className="text-[9px] sm:text-xs px-1 sm:px-2 py-0">{workout.category}</Badge>
                      </div>
                    </CardContent>
                  </InteractiveCard>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-3 mt-3">
            {filteredExercises.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No exercises found. Try adjusting your filters.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {filteredExercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
                      <div className="aspect-video bg-muted rounded-md sm:rounded-lg mb-1 sm:mb-2 overflow-hidden">
                        {exercise.thumbnail_url ? (
                          <img src={exercise.thumbnail_url} alt={exercise.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="h-6 sm:h-12 w-6 sm:w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-start gap-1">
                        <CardTitle className="text-xs sm:text-lg line-clamp-1">{exercise.name}</CardTitle>
                        <Badge className={`${getDifficultyColor(exercise.difficulty_level)} text-[9px] sm:text-xs shrink-0 px-1 sm:px-2 py-0`}>
                          <span className="sm:hidden">{exercise.difficulty_level.charAt(0).toUpperCase()}</span>
                          <span className="hidden sm:inline">{exercise.difficulty_level}</span>
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-[10px] sm:text-sm hidden sm:block">
                        {exercise.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 pt-0">
                      <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                        {exercise.muscle_groups.slice(0, 2).map((group, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] sm:text-xs px-1 sm:px-2 py-0">
                            {group}
                          </Badge>
                        ))}
                        {exercise.muscle_groups.length > 2 && (
                          <Badge variant="secondary" className="text-[9px] sm:text-xs px-1 sm:px-2 py-0">
                            +{exercise.muscle_groups.length - 2}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        {exercise.duration_minutes}m
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkoutLibrary;
