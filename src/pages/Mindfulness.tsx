import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Play, Brain, Wind, Heart, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import { BreathingExercise } from "@/components/BreathingExercise";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import { useGamification } from "@/hooks/useGamification";

interface MeditationProgram {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  duration_minutes: number;
  instructions: string;
  benefits: string[];
  tags: string[];
  is_guided: boolean;
}

interface BreathingExerciseType {
  id: string;
  name: string;
  description: string;
  technique_type: string;
  duration_minutes: number;
  inhale_seconds: number;
  hold_seconds: number | null;
  exhale_seconds: number;
  rest_seconds: number | null;
  cycles: number;
  benefits: string[];
  difficulty_level: string;
  instructions: string;
}

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  weekStreak: number;
}

const Mindfulness = () => {
  const [meditationPrograms, setMeditationPrograms] = useState<MeditationProgram[]>([]);
  const [breathingExercises, setBreathingExercises] = useState<BreathingExerciseType[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<MeditationProgram | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<BreathingExerciseType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [stats, setStats] = useState<SessionStats>({ totalSessions: 0, totalMinutes: 0, weekStreak: 0 });
  const [activeTab, setActiveTab] = useState("browse");
  const [userId, setUserId] = useState<string | null>(null);

  // Gamification hook
  const { awardPoints, checkAchievements } = useGamification(userId);

  useEffect(() => {
    fetchData();
    fetchStats();
    // Get user ID for gamification
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  const fetchData = async () => {
    try {
      const [programsRes, exercisesRes] = await Promise.all([
        supabase.from("meditation_programs").select("*").eq("is_public", true),
        supabase.from("breathing_exercises").select("*")
      ]);

      if (programsRes.error) throw programsRes.error;
      if (exercisesRes.error) throw exercisesRes.error;

      setMeditationPrograms(programsRes.data || []);
      setBreathingExercises(exercisesRes.data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_meditation_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false });

      if (error) throw error;

      const totalSessions = data?.length || 0;
      const totalMinutes = data?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;

      setStats({ totalSessions, totalMinutes, weekStreak: 0 });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const startMeditationSession = (program: MeditationProgram) => {
    setSelectedProgram(program);
    setSessionActive(true);
    setSessionTime(0);
    toast.success(`Starting ${program.title}`);
  };

  const endSession = async () => {
    if (!selectedProgram) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const durationMinutes = Math.floor(sessionTime / 60);

      const { data: sessionData, error } = await supabase
        .from("user_meditation_sessions")
        .insert({
          user_id: user.id,
          program_id: selectedProgram.id,
          session_type: 'meditation',
          duration_minutes: durationMinutes,
          completed: true,
          session_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Award points for meditation session
      const basePoints = 25; // Base points for any meditation
      const durationBonus = Math.min(durationMinutes * 3, 45); // Up to 45 bonus points based on duration
      const totalPoints = basePoints + durationBonus;
      
      await awardPoints(
        totalPoints,
        'meditation',
        `Completed meditation: ${selectedProgram.title}`,
        sessionData?.id,
        'meditation_session'
      );
      
      // Check for new achievements
      await checkAchievements();

      toast.success(`Session completed! ${durationMinutes} minutes`);
      setSessionActive(false);
      setSelectedProgram(null);
      setSessionTime(0);
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const completeBreathingExercise = async () => {
    if (!selectedExercise) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: sessionData, error } = await supabase
        .from("user_meditation_sessions")
        .insert({
          user_id: user.id,
          exercise_id: selectedExercise.id,
          session_type: 'breathing',
          duration_minutes: selectedExercise.duration_minutes,
          completed: true,
          session_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Award points for breathing exercise
      const points = 15 + Math.min(selectedExercise.duration_minutes * 2, 20); // 15 base + up to 20 bonus
      
      await awardPoints(
        points,
        'breathing',
        `Completed breathing exercise: ${selectedExercise.name}`,
        sessionData?.id,
        'meditation_session'
      );
      
      // Check for new achievements
      await checkAchievements();

      toast.success("Breathing exercise completed!");
      setSelectedExercise(null);
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sessionActive && selectedProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="w-full max-w-2xl">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl text-center">{selectedProgram.title}</CardTitle>
            <CardDescription className="text-center text-sm">{selectedProgram.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold mb-2">{formatTime(sessionTime)}</div>
              <div className="text-sm text-muted-foreground">
                Target: {selectedProgram.duration_minutes} minutes
              </div>
            </div>

            <Progress 
              value={(sessionTime / (selectedProgram.duration_minutes * 60)) * 100} 
              className="w-full h-2"
            />

            <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Instructions:</h4>
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">
                {selectedProgram.instructions}
              </p>
            </div>

            <Button onClick={endSession} className="w-full h-11 sm:h-12 text-base" size="lg">
              End Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="w-full max-w-2xl space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedExercise(null)}
            className="mb-2 h-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <BreathingExercise 
            exercise={selectedExercise} 
            onComplete={completeBreathingExercise}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-6xl">
        <div className="mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold font-heading mb-0.5 sm:mb-2">Mindfulness</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Find calm, reduce stress, and improve focus
          </p>
        </div>

        <div className="grid gap-2 sm:gap-3 grid-cols-3 mb-3 sm:mb-6">
          <Card>
            <CardHeader className="p-2.5 sm:p-3 pb-0.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-[10px] text-muted-foreground sm:hidden">Sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2.5 sm:p-3 pb-0.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Minutes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalMinutes}</div>
              <p className="text-[10px] text-muted-foreground sm:hidden">Minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2.5 sm:p-3 pb-0.5 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">This Week</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.weekStreak}</div>
              <p className="text-[10px] text-muted-foreground sm:hidden">Week</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
            <TabsTrigger value="browse" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Meditation
            </TabsTrigger>
            <TabsTrigger value="breathing" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <Wind className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Breathing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-2 sm:space-y-3">
            <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-3">
              {meditationPrograms.map((program) => (
                <Card key={program.id} className="hover:shadow-lg transition-all">
                  <CardHeader className="p-2.5 sm:p-4 pb-1.5 sm:pb-2">
                    <div className="flex justify-between items-start gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                      <CardTitle className="text-xs sm:text-base font-semibold line-clamp-1">{program.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2">{program.difficulty_level}</Badge>
                    </div>
                    <CardDescription className="text-[10px] sm:text-sm line-clamp-2">{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2.5 sm:p-4 pt-0 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                        {program.duration_minutes}m
                      </span>
                      <span className="capitalize line-clamp-1 text-[10px] sm:text-xs">{program.category.replace('_', ' ')}</span>
                    </div>

                    <div className="hidden sm:flex flex-wrap gap-1">
                      {program.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {program.tags?.length > 2 && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">+{program.tags.length - 2}</Badge>
                      )}
                    </div>

                    <div className="hidden sm:block space-y-0.5">
                      <p className="text-[10px] sm:text-xs font-semibold">Benefits:</p>
                      <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                        {program.benefits?.slice(0, 2).map((benefit, idx) => (
                          <li key={idx} className="line-clamp-1">• {benefit}</li>
                        ))}
                      </ul>
                    </div>

                    <Button 
                      onClick={() => startMeditationSession(program)}
                      className="w-full h-8 sm:h-10 text-xs sm:text-sm"
                    >
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Start
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="breathing" className="space-y-2 sm:space-y-3">
            <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-3">
              {breathingExercises.map((exercise) => (
                <Card key={exercise.id} className="hover:shadow-lg transition-all">
                  <CardHeader className="p-2.5 sm:p-4 pb-1.5 sm:pb-2">
                    <div className="flex justify-between items-start gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                      <CardTitle className="text-xs sm:text-base font-semibold line-clamp-1">{exercise.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2">{exercise.difficulty_level}</Badge>
                    </div>
                    <CardDescription className="text-[10px] sm:text-sm line-clamp-2">{exercise.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2.5 sm:p-4 pt-0 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                        {exercise.duration_minutes}m
                      </span>
                      <span>{exercise.cycles} cycles</span>
                    </div>

                    <div className="bg-muted/50 p-1.5 sm:p-2 rounded text-[10px] sm:text-xs space-y-0.5">
                      <div className="flex gap-2">
                        <span>In: {exercise.inhale_seconds}s</span>
                        {exercise.hold_seconds && <span>Hold: {exercise.hold_seconds}s</span>}
                      </div>
                      <div className="flex gap-2">
                        <span>Out: {exercise.exhale_seconds}s</span>
                        {exercise.rest_seconds && <span>Rest: {exercise.rest_seconds}s</span>}
                      </div>
                    </div>

                    <div className="hidden sm:block space-y-0.5">
                      <p className="text-[10px] sm:text-xs font-semibold">Benefits:</p>
                      <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                        {exercise.benefits?.slice(0, 2).map((benefit, idx) => (
                          <li key={idx} className="line-clamp-1">• {benefit}</li>
                        ))}
                      </ul>
                    </div>

                    <Button 
                      onClick={() => setSelectedExercise(exercise)}
                      className="w-full h-8 sm:h-10 text-xs sm:text-sm"
                    >
                      <Wind className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Start
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Mindfulness;