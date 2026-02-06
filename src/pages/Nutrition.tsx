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
import { BottomNav } from "@/components/BottomNav";

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
      <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
        <div className="flex justify-between items-start gap-1">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs sm:text-lg line-clamp-1">{recipe.name}</CardTitle>
            <CardDescription className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm line-clamp-2 hidden sm:block">{recipe.description}</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1 sm:mt-2">
          {recipe.dietary_tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[9px] sm:text-xs px-1 sm:px-2 py-0">
              {tag}
            </Badge>
          ))}
          {recipe.dietary_tags?.length > 2 && (
            <Badge variant="secondary" className="text-[9px] sm:text-xs px-1 sm:px-2 py-0">+{recipe.dietary_tags.length - 2}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-0">
        <div className="space-y-1 sm:space-y-2">
          <div className="grid grid-cols-2 gap-0.5 sm:gap-2 text-[10px] sm:text-sm">
            <div>⏱️ {recipe.prep_time_minutes}m</div>
            <div>🔥 {recipe.cook_time_minutes}m</div>
            <div className="hidden sm:block">🍽️ {recipe.servings} servings</div>
            <div>📊 {recipe.calories_per_serving} cal</div>
          </div>
          <div className="hidden sm:flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>P: {recipe.protein_grams}g</span>
            <span>C: {recipe.carbs_grams}g</span>
            <span>F: {recipe.fat_grams}g</span>
          </div>
          {showAddButton && (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-2 pt-1 sm:pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-[9px] sm:text-xs px-0.5 sm:px-2 h-6 sm:h-8"
                onClick={() => addToMealPlan(recipe, 'breakfast')}
              >
                B
                <span className="hidden sm:inline">reakfast</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-[9px] sm:text-xs px-0.5 sm:px-2 h-6 sm:h-8"
                onClick={() => addToMealPlan(recipe, 'lunch')}
              >
                L
                <span className="hidden sm:inline">unch</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-[9px] sm:text-xs px-0.5 sm:px-2 h-6 sm:h-8"
                onClick={() => addToMealPlan(recipe, 'dinner')}
              >
                D
                <span className="hidden sm:inline">inner</span>
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
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
            {title}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMealSuggestions(mealType)}
            disabled={isGenerating}
            className="h-8 text-xs sm:text-sm px-2 sm:px-3"
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            )}
            <span className="hidden sm:inline">AI </span>Suggest
          </Button>
        </div>
        {meals.length === 0 ? (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center text-muted-foreground text-xs sm:text-sm">
              No meals planned. Browse recipes or generate AI suggestions!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {meals.map((plan) => (
              <Card key={plan.id} className={plan.completed ? "opacity-60" : ""}>
                <CardContent className="p-3 sm:py-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <input
                      type="checkbox"
                      checked={plan.completed}
                      onChange={() => toggleMealComplete(plan.id, plan.completed)}
                      className="mt-1 h-4 w-4 sm:h-5 sm:w-5 rounded border-primary shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base line-clamp-1">{plan.recipe.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{plan.recipe.description}</p>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-1 sm:mt-2">
                        <span>{plan.recipe.calories_per_serving} cal</span>
                        <span>P: {plan.recipe.protein_grams}g</span>
                        <span>C: {plan.recipe.carbs_grams}g</span>
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
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-6xl">
        <div className="mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold font-heading mb-0.5 sm:mb-2">Nutrition</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Plan meals and get personalized recommendations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="today" className="text-xs sm:text-sm">
              <CalendarIcon className="h-4 w-4 mr-1 sm:mr-2" />
              Today's Plan
            </TabsTrigger>
            <TabsTrigger value="browse" className="text-xs sm:text-sm">
              <Utensils className="h-4 w-4 mr-1 sm:mr-2" />
              Recipes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">Select Date</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border w-fit"
                />
              </CardContent>
            </Card>

            <div className="space-y-4 sm:space-y-6">
              <MealSection title="Breakfast" mealType="breakfast" />
              <MealSection title="Lunch" mealType="lunch" />
              <MealSection title="Dinner" mealType="dinner" />
              <MealSection title="Snacks" mealType="snack" />
            </div>
          </TabsContent>

          <TabsContent value="browse" className="space-y-2 sm:space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-2xl font-semibold">Recipe Library</h2>
            </div>
            <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAddButton={true} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Nutrition;