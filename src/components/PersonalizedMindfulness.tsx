import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertTriangle, Brain, Wind, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MindfulnessRecommendation {
  item_id: string;
  item_type: "meditation" | "breathing";
  reasoning: string;
  safety_notes?: string;
  priority: number;
  program?: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty_level: string;
    duration_minutes: number;
    is_guided: boolean;
  };
  exercise?: {
    id: string;
    name: string;
    description: string;
    technique_type: string;
    difficulty_level: string;
    duration_minutes: number;
  };
}

interface RecommendationsResponse {
  recommendations: MindfulnessRecommendation[];
  overall_advice: string;
  cautions: string[];
  user_profile: {
    fitness_level: string | null;
    medical_conditions: string[] | null;
    health_goals: string[] | null;
  };
  mood_summary: {
    avg_mood: number;
    avg_stress: number | null;
  } | null;
}

interface PersonalizedMindfulnessProps {
  onSelectMeditation?: (programId: string) => void;
  onSelectBreathing?: (exerciseId: string) => void;
}

const PersonalizedMindfulness = ({ onSelectMeditation, onSelectBreathing }: PersonalizedMindfulnessProps) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: funcError } = await supabase.functions.invoke(
        'generate-mindfulness-recommendations'
      );

      if (funcError) throw funcError;
      if (response.error) throw new Error(response.error);

      setData(response);
    } catch (err) {
      console.error('Error fetching mindfulness recommendations:', err);
      const message = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (rec: MindfulnessRecommendation) => {
    if (rec.item_type === 'meditation' && rec.program && onSelectMeditation) {
      onSelectMeditation(rec.program.id);
    } else if (rec.item_type === 'breathing' && rec.exercise && onSelectBreathing) {
      onSelectBreathing(rec.exercise.id);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/10 text-green-500";
      case "intermediate": return "bg-yellow-500/10 text-yellow-500";
      case "advanced": return "bg-red-500/10 text-red-500";
      default: return "bg-muted";
    }
  };

  if (!data && !loading && !error) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Mindfulness Coach</CardTitle>
          </div>
          <CardDescription>
            Get personalized meditation & breathing recommendations based on your health conditions and stress levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchRecommendations} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Get Personalized Recommendations
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your wellness profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchRecommendations} variant="outline" className="w-full mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm sm:text-base">Recommended for You</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRecommendations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Overall advice */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">{data.overall_advice}</AlertDescription>
      </Alert>

      {/* Mood summary */}
      {data.mood_summary && (
        <div className="flex gap-2">
          {data.mood_summary.avg_mood && (
            <Badge variant="outline" className="text-xs gap-1">
              😊 Avg Mood: {data.mood_summary.avg_mood}/5
            </Badge>
          )}
          {data.mood_summary.avg_stress != null && (
            <Badge variant="outline" className="text-xs gap-1">
              😰 Avg Stress: {data.mood_summary.avg_stress}/5
            </Badge>
          )}
        </div>
      )}

      {/* Cautions */}
      {data.cautions && data.cautions.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-medium">Safety Notes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
              {data.cautions.map((caution, i) => (
                <li key={i}>{caution}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      <div className="space-y-2 sm:space-y-3">
        {data.recommendations.map((rec, index) => {
          const name = rec.item_type === 'meditation' ? rec.program?.title : rec.exercise?.name;
          const description = rec.item_type === 'meditation' ? rec.program?.description : rec.exercise?.description;
          const difficulty = rec.item_type === 'meditation' ? rec.program?.difficulty_level : rec.exercise?.difficulty_level;
          const duration = rec.item_type === 'meditation' ? rec.program?.duration_minutes : rec.exercise?.duration_minutes;
          const category = rec.item_type === 'meditation' ? rec.program?.category : rec.exercise?.technique_type;

          return (
            <Card
              key={`${rec.item_type}-${rec.item_id}`}
              className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => handleSelect(rec)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {rec.item_type === 'meditation' ? (
                      <Brain className="h-4 w-4 text-primary" />
                    ) : (
                      <Wind className="h-4 w-4 text-secondary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-xs sm:text-sm line-clamp-1">{name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                            {rec.item_type === 'meditation' ? '🧘 Meditation' : '🌬️ Breathing'}
                          </Badge>
                          {difficulty && (
                            <Badge className={`${getDifficultyColor(difficulty)} text-[10px] sm:text-xs px-1.5 py-0`}>
                              {difficulty}
                            </Badge>
                          )}
                          {duration && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground">{duration}min</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary">#{index + 1}</span>
                    </div>

                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {rec.reasoning}
                    </p>

                    {rec.safety_notes && (
                      <div className="mt-1.5 p-1.5 sm:p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-400">
                          ⚠️ {rec.safety_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Profile summary */}
      {data.user_profile.fitness_level && (
        <Card className="bg-muted/50">
          <CardContent className="p-3 text-xs text-muted-foreground">
            <p>
              Based on: <span className="font-medium text-foreground">{data.user_profile.fitness_level}</span> fitness level
              {data.user_profile.medical_conditions?.length ? (
                <>, considering {data.user_profile.medical_conditions.length} health condition(s)</>
              ) : null}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonalizedMindfulness;
