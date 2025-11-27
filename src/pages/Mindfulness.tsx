import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Play, Brain, Wind, Heart, Clock, TrendingUp } from "lucide-react";
import { BreathingExercise } from "@/components/BreathingExercise";
import { format } from "date-fns";

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

  useEffect(() => {
    fetchData();
    fetchStats();
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

      const { error } = await supabase
        .from("user_meditation_sessions")
        .insert({
          user_id: user.id,
          program_id: selectedProgram.id,
          session_type: 'meditation',
          duration_minutes: durationMinutes,
          completed: true,
          session_date: new Date().toISOString()
        });

      if (error) throw error;

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

      const { error } = await supabase
        .from("user_meditation_sessions")
        .insert({
          user_id: user.id,
          exercise_id: selectedExercise.id,
          session_type: 'breathing',
          duration_minutes: selectedExercise.duration_minutes,
          completed: true,
          session_date: new Date().toISOString()
        });

      if (error) throw error;

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{selectedProgram.title}</CardTitle>
            <CardDescription className="text-center">{selectedProgram.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{formatTime(sessionTime)}</div>
              <div className="text-muted-foreground">
                Target: {selectedProgram.duration_minutes} minutes
              </div>
            </div>

            <Progress 
              value={(sessionTime / (selectedProgram.duration_minutes * 60)) * 100} 
              className="w-full"
            />

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Instructions:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {selectedProgram.instructions}
              </p>
            </div>

            <Button onClick={endSession} className="w-full" size="lg">
              End Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="w-full max-w-2xl space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedExercise(null)}
            className="mb-4"
          >
            ← Back
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
    <div className="container mx-auto p-4 pb-20 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-heading mb-2">Mindfulness & Meditation</h1>
        <p className="text-muted-foreground">
          Find calm, reduce stress, and improve focus through guided practices
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMinutes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekStreak}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">
            <Brain className="h-4 w-4 mr-2" />
            Meditation
          </TabsTrigger>
          <TabsTrigger value="breathing">
            <Wind className="h-4 w-4 mr-2" />
            Breathing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {meditationPrograms.map((program) => (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{program.title}</CardTitle>
                    <Badge variant="secondary">{program.difficulty_level}</Badge>
                  </div>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {program.duration_minutes} min
                    </span>
                    <span className="capitalize">{program.category.replace('_', ' ')}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {program.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Benefits:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {program.benefits.slice(0, 3).map((benefit, idx) => (
                        <li key={idx}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    onClick={() => startMeditationSession(program)}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="breathing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {breathingExercises.map((exercise) => (
              <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    <Badge variant="secondary">{exercise.difficulty_level}</Badge>
                  </div>
                  <CardDescription>{exercise.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {exercise.duration_minutes} min
                    </span>
                    <span>{exercise.cycles} cycles</span>
                  </div>

                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <div>Inhale: {exercise.inhale_seconds}s</div>
                    {exercise.hold_seconds && <div>Hold: {exercise.hold_seconds}s</div>}
                    <div>Exhale: {exercise.exhale_seconds}s</div>
                    {exercise.rest_seconds && <div>Rest: {exercise.rest_seconds}s</div>}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Benefits:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {exercise.benefits.slice(0, 3).map((benefit, idx) => (
                        <li key={idx}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    onClick={() => setSelectedExercise(exercise)}
                    className="w-full"
                  >
                    <Wind className="h-4 w-4 mr-2" />
                    Start Exercise
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mindfulness;