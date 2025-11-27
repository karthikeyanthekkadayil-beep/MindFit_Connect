import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Utensils, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Recipe {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  calories_per_serving: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams: number;
  dietary_tags: string[];
  meal_type: string;
  ingredients: any;
  instructions: string;
}

interface MealPlan {
  id: string;
  planned_date: string;
  meal_type: string;
  servings: number;
  completed: boolean;
  recipe: Recipe;
}

const Nutrition = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    fetchMealPlans();
    fetchRecipes();
  }, [selectedDate]);

  const fetchMealPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from("user_meal_plans")
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq("user_id", user.id)
        .eq("planned_date", dateStr)
        .order("meal_type");

      if (error) throw error;
      setMealPlans(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_public", true)
        .limit(20);

      if (error) throw error;
      setRecipes(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const generateMealSuggestions = async (mealType: string) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('generate-meal-suggestions', {
        body: {
          userProfile: profile,
          mealType,
          date: format(selectedDate, 'yyyy-MM-dd')
        }
      });

      if (error) throw error;

      // Save suggested recipes to database
      for (const suggestion of data.suggestions) {
        const { error: insertError } = await supabase
          .from("recipes")
          .insert({
            ...suggestion,
            created_by: user.id,
            is_public: false
          });

        if (insertError) console.error("Error saving recipe:", insertError);
      }

      toast.success(`Generated ${data.suggestions.length} ${mealType} suggestions!`);
      fetchRecipes();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate suggestions");
    } finally {
      setIsGenerating(false);
    }
  };

  const addToMealPlan = async (recipe: Recipe, mealType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_meal_plans")
        .insert({
          user_id: user.id,
          recipe_id: recipe.id,
          planned_date: format(selectedDate, 'yyyy-MM-dd'),
          meal_type: mealType,
          servings: recipe.servings
        });

      if (error) throw error;
      toast.success("Added to meal plan!");
      fetchMealPlans();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleMealComplete = async (planId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("user_meal_plans")
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq("id", planId);

      if (error) throw error;
      fetchMealPlans();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getMealsByType = (type: string) => {
    return mealPlans.filter(plan => plan.meal_type.toLowerCase() === type.toLowerCase());
  };

  const RecipeCard = ({ recipe, showAddButton = false }: { recipe: Recipe; showAddButton?: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{recipe.name}</CardTitle>
            <CardDescription className="mt-1">{recipe.description}</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {recipe.dietary_tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>⏱️ Prep: {recipe.prep_time_minutes}min</div>
            <div>🔥 Cook: {recipe.cook_time_minutes}min</div>
            <div>🍽️ {recipe.servings} servings</div>
            <div>📊 {recipe.calories_per_serving} cal</div>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>P: {recipe.protein_grams}g</span>
            <span>C: {recipe.carbs_grams}g</span>
            <span>F: {recipe.fat_grams}g</span>
            <span>Fiber: {recipe.fiber_grams}g</span>
          </div>
          {showAddButton && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => addToMealPlan(recipe, 'breakfast')}
              >
                Add to Breakfast
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => addToMealPlan(recipe, 'lunch')}
              >
                Add to Lunch
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => addToMealPlan(recipe, 'dinner')}
              >
                Add to Dinner
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const MealSection = ({ title, mealType }: { title: string; mealType: string }) => {
    const meals = getMealsByType(mealType);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            {title}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMealSuggestions(mealType)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Suggest
          </Button>
        </div>
        {meals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No meals planned. Browse recipes or generate AI suggestions!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {meals.map((plan) => (
              <Card key={plan.id} className={plan.completed ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={plan.completed}
                      onChange={() => toggleMealComplete(plan.id, plan.completed)}
                      className="mt-1 h-5 w-5 rounded border-primary"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{plan.recipe.name}</h4>
                      <p className="text-sm text-muted-foreground">{plan.recipe.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                        <span>{plan.recipe.calories_per_serving} cal</span>
                        <span>P: {plan.recipe.protein_grams}g</span>
                        <span>C: {plan.recipe.carbs_grams}g</span>
                        <span>F: {plan.recipe.fat_grams}g</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-heading mb-2">Nutrition Planning</h1>
        <p className="text-muted-foreground">
          Plan your meals and get personalized nutrition recommendations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today's Plan
          </TabsTrigger>
          <TabsTrigger value="browse">
            <Utensils className="h-4 w-4 mr-2" />
            Browse Recipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <MealSection title="Breakfast" mealType="breakfast" />
            <MealSection title="Lunch" mealType="lunch" />
            <MealSection title="Dinner" mealType="dinner" />
            <MealSection title="Snacks" mealType="snack" />
          </div>
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Recipe Library</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} showAddButton={true} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Nutrition;