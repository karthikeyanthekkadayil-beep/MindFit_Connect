import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search, Dumbbell, Heart, Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

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

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch user profile for fitness level
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Workout Library</h1>
            <p className="text-muted-foreground mt-1">
              {userProfile?.fitness_level && `Recommended for ${userProfile.fitness_level} level`}
            </p>
          </div>
          <Button onClick={() => navigate("/workouts/builder")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Custom Workout
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises and workouts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full md:w-48">
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

        {/* Content Tabs */}
        <Tabs defaultValue="workouts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workouts">
              <Dumbbell className="h-4 w-4 mr-2" />
              Workouts ({filteredWorkouts.length})
            </TabsTrigger>
            <TabsTrigger value="exercises">
              <Heart className="h-4 w-4 mr-2" />
              Exercises ({filteredExercises.length})
            </TabsTrigger>
          </TabsList>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-4">
            {filteredWorkouts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No workouts found. Try adjusting your filters.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkouts.map((workout) => (
                  <Card 
                    key={workout.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/workouts/${workout.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                        {workout.image_url ? (
                          <img src={workout.image_url} alt={workout.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{workout.name}</CardTitle>
                        <Badge className={getDifficultyColor(workout.difficulty_level)}>
                          {workout.difficulty_level}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {workout.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{workout.total_duration_minutes} min</span>
                        <Badge variant="outline">{workout.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4">
            {filteredExercises.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No exercises found. Try adjusting your filters.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                        {exercise.thumbnail_url ? (
                          <img src={exercise.thumbnail_url} alt={exercise.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{exercise.name}</CardTitle>
                        <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                          {exercise.difficulty_level}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {exercise.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {exercise.muscle_groups.slice(0, 3).map((group, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                        {exercise.muscle_groups.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{exercise.muscle_groups.length - 3}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {exercise.duration_minutes} min
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default WorkoutLibrary;
