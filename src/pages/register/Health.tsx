import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const HealthAssessment = () => {
  const navigate = useNavigate();
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [healthGoals, setHealthGoals] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store data in sessionStorage to pass to next step
    sessionStorage.setItem("healthData", JSON.stringify({
      fitnessLevel,
      medicalConditions: medicalConditions.split(",").map(s => s.trim()).filter(Boolean),
      dietaryPreferences: dietaryPreferences.split(",").map(s => s.trim()).filter(Boolean),
      healthGoals: healthGoals.split(",").map(s => s.trim()).filter(Boolean),
    }));
    
    toast.success("Health information saved!");
    navigate("/register/preferences");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-2">
            <Progress value={50} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">Step 2 of 3</p>
          </div>
          <CardTitle className="text-2xl font-heading">Health Assessment</CardTitle>
          <CardDescription>
            Help us personalize your wellness journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fitness-level">Fitness Level</Label>
              <Select value={fitnessLevel} onValueChange={setFitnessLevel} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your fitness level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="athlete">Athlete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical-conditions">Medical Conditions (comma-separated)</Label>
              <Textarea
                id="medical-conditions"
                placeholder="e.g., asthma, diabetes, or leave empty if none"
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary-preferences">Dietary Preferences (comma-separated)</Label>
              <Textarea
                id="dietary-preferences"
                placeholder="e.g., vegetarian, gluten-free, vegan"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health-goals">Health Goals (comma-separated)</Label>
              <Textarea
                id="health-goals"
                placeholder="e.g., lose weight, build muscle, improve flexibility"
                value={healthGoals}
                onChange={(e) => setHealthGoals(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthAssessment;
