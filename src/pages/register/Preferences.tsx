import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Preferences = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in first");
        navigate("/auth");
        return;
      }

      // Get health data from sessionStorage
      const healthData = JSON.parse(sessionStorage.getItem("healthData") || "{}");
      
      const { error } = await supabase
        .from("profiles")
        .update({
          bio,
          location,
          activity_interests: interests.split(",").map(s => s.trim()).filter(Boolean),
          fitness_level: healthData.fitnessLevel,
          medical_conditions: healthData.medicalConditions,
          dietary_preferences: healthData.dietaryPreferences,
          health_goals: healthData.healthGoals,
        })
        .eq("id", user.id);

      if (error) throw error;

      sessionStorage.removeItem("healthData");
      toast.success("Profile completed!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-2">
            <Progress value={100} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">Step 3 of 3</p>
          </div>
          <CardTitle className="text-2xl font-heading">Personal Preferences</CardTitle>
          <CardDescription>
            Let's personalize your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="interests">Activity Interests (comma-separated)</Label>
              <Textarea
                id="interests"
                placeholder="e.g., hiking, yoga, swimming, cycling"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/register/health")}
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Registration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Preferences;
