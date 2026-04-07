import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, InteractiveCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Utensils, Target, Flame, TrendingDown,
  TrendingUp, Minus, ChevronRight, Plus, X, Settings2,
  ChefHat, Apple, Beef, Wheat, Droplets, Clock, ShoppingCart,
  ClipboardList, Save, Trash2, ArrowLeft, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionFadeIn } from "@/components/motion/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";

// Types
interface NutritionSettings {
  maintenanceCalories: number;
  dietGoal: "cut" | "bulk" | "maintain";
  targetCalories: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  availableIngredients: string[];
  setupComplete: boolean;
}

interface AIMealSuggestion {
  name: string;
  description: string;
  calories_per_serving: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  ingredients: { item: string; amount: string }[] | string[];
  instructions: string;
  dietary_tags: string[];
  meal_type: string;
  uses_available?: boolean;
  extra_needed?: string[];
}

const DEFAULT_SETTINGS: NutritionSettings = {
  maintenanceCalories: 2000,
  dietGoal: "maintain",
  targetCalories: 2000,
  proteinTarget: 150,
  carbsTarget: 200,
  fatTarget: 67,
  availableIngredients: [],
  setupComplete: false,
};

const GOAL_OPTIONS = [
  { id: "cut" as const, label: "Cut", icon: TrendingDown, desc: "Lose fat", color: "text-secondary", modifier: -500 },
  { id: "maintain" as const, label: "Maintain", icon: Minus, desc: "Stay same", color: "text-primary", modifier: 0 },
  { id: "bulk" as const, label: "Bulk", icon: TrendingUp, desc: "Gain muscle", color: "text-accent", modifier: 500 },
];

const loadSettings = (): NutritionSettings => {
  try {
    const saved = localStorage.getItem("nutrition-settings");
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: NutritionSettings) => {
  localStorage.setItem("nutrition-settings", JSON.stringify(settings));
};

// ──────────────── Setup Wizard ────────────────
const SetupWizard = ({ onComplete }: { onComplete: (s: NutritionSettings) => void }) => {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<NutritionSettings>(loadSettings());
  const [newIngredient, setNewIngredient] = useState("");

  const updateGoal = (goal: "cut" | "bulk" | "maintain") => {
    const modifier = GOAL_OPTIONS.find(g => g.id === goal)!.modifier;
    const target = settings.maintenanceCalories + modifier;
    const protein = Math.round(goal === "cut" ? target * 0.4 / 4 : goal === "bulk" ? target * 0.3 / 4 : target * 0.25 / 4);
    const fat = Math.round(target * 0.25 / 9);
    const carbs = Math.round((target - protein * 4 - fat * 9) / 4);
    setSettings(s => ({ ...s, dietGoal: goal, targetCalories: target, proteinTarget: protein, carbsTarget: carbs, fatTarget: fat }));
  };

  const addIngredient = () => {
    const item = newIngredient.trim();
    if (!item || settings.availableIngredients.includes(item)) return;
    setSettings(s => ({ ...s, availableIngredients: [...s.availableIngredients, item] }));
    setNewIngredient("");
  };

  const removeIngredient = (item: string) => {
    setSettings(s => ({ ...s, availableIngredients: s.availableIngredients.filter(i => i !== item) }));
  };

  const finish = () => {
    const final = { ...settings, setupComplete: true };
    saveSettings(final);
    onComplete(final);
  };

  const steps = [
    // Step 0: Maintenance Calories
    <motion.div key="cal" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Flame className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-heading">Maintenance Calories</h2>
        <p className="text-sm text-muted-foreground">Your daily calorie needs to maintain current weight</p>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <span className="text-5xl font-bold text-primary">{settings.maintenanceCalories}</span>
          <span className="text-lg text-muted-foreground ml-1">kcal</span>
        </div>
        <Slider
          value={[settings.maintenanceCalories]}
          onValueChange={([v]) => setSettings(s => ({ ...s, maintenanceCalories: v }))}
          min={1200}
          max={4000}
          step={50}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1200</span>
          <span>4000</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Use a TDEE calculator if unsure. Average: 1800–2500 for women, 2200–3000 for men.
        </p>
      </div>
    </motion.div>,

    // Step 1: Goal
    <motion.div key="goal" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <Target className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold font-heading">Monthly Goal</h2>
        <p className="text-sm text-muted-foreground">What do you want to achieve this month?</p>
      </div>
      <div className="space-y-3">
        {GOAL_OPTIONS.map(goal => (
          <InteractiveCard
            key={goal.id}
            className={cn(
              "cursor-pointer border-2 transition-all",
              settings.dietGoal === goal.id ? "border-primary shadow-md" : "border-transparent"
            )}
            onClick={() => updateGoal(goal.id)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-muted/50", goal.color)}>
                <goal.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{goal.label}</h3>
                <p className="text-xs text-muted-foreground">{goal.desc} • {goal.modifier > 0 ? '+' : ''}{goal.modifier} kcal/day</p>
              </div>
              {settings.dietGoal === goal.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </CardContent>
          </InteractiveCard>
        ))}
      </div>
      <Card className="bg-muted/30 border-0">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium">Daily Target: <span className="text-primary font-bold">{settings.maintenanceCalories + (GOAL_OPTIONS.find(g => g.id === settings.dietGoal)?.modifier || 0)} kcal</span></p>
          <p className="text-xs text-muted-foreground mt-1">P: {settings.proteinTarget}g • C: {settings.carbsTarget}g • F: {settings.fatTarget}g</p>
        </CardContent>
      </Card>
    </motion.div>,

    // Step 2: Available Ingredients
    <motion.div key="ing" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
          <ShoppingCart className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="text-xl font-bold font-heading">What's in Your Kitchen?</h2>
        <p className="text-sm text-muted-foreground">Add ingredients you have at home. AI will create meals using these.</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={newIngredient}
          onChange={(e) => setNewIngredient(e.target.value)}
          placeholder="e.g. chicken, rice, eggs..."
          onKeyDown={(e) => e.key === "Enter" && addIngredient()}
          className="flex-1"
        />
        <Button onClick={addIngredient} size="icon" variant="secondary">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[60px]">
        <AnimatePresence>
          {settings.availableIngredients.map(item => (
            <motion.div key={item} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-1.5 cursor-pointer" onClick={() => removeIngredient(item)}>
                {item}
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
        {settings.availableIngredients.length === 0 && (
          <p className="text-xs text-muted-foreground italic w-full text-center py-4">No ingredients added yet. Add what you have!</p>
        )}
      </div>
      {/* Quick-add suggestions */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
        <div className="flex flex-wrap gap-1.5">
          {["Chicken", "Rice", "Eggs", "Bread", "Milk", "Oats", "Banana", "Spinach", "Pasta", "Tomato", "Onion", "Garlic", "Olive Oil", "Cheese", "Yogurt", "Potatoes"].map(item => (
            !settings.availableIngredients.includes(item) && (
              <Badge
                key={item}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => setSettings(s => ({ ...s, availableIngredients: [...s.availableIngredients, item] }))}
              >
                + {item}
              </Badge>
            )
          ))}
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-8 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {steps[step]}
        </AnimatePresence>

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} className="flex-1">
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} className="flex-1">
              <Sparkles className="h-4 w-4 mr-1" /> Start Planning
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────── Macro Ring ────────────────
const MacroRing = ({ label, current, target, color, icon: Icon }: { label: string; current: number; target: number; color: string; icon: React.ElementType }) => {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="text-center space-y-1">
      <div className="relative w-16 h-16 mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct * 0.975} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-xs font-medium">{current}g</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

// ──────────────── Meal Card ────────────────
const AIMealCard = ({ meal, onAdd }: { meal: AIMealSuggestion; onAdd: (m: AIMealSuggestion) => void }) => {
  const [expanded, setExpanded] = useState(false);

  const ingredients = Array.isArray(meal.ingredients)
    ? meal.ingredients.map(i => typeof i === 'string' ? i : `${i.amount} ${i.item}`)
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <InteractiveCard className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{meal.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{meal.description}</p>
            </div>
          </div>

          {/* Macros row */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-primary font-medium">
              <Flame className="h-3 w-3" /> {meal.calories_per_serving} kcal
            </span>
            <span className="text-muted-foreground">P: {meal.protein_grams}g</span>
            <span className="text-muted-foreground">C: {meal.carbs_grams}g</span>
            <span className="text-muted-foreground">F: {meal.fat_grams}g</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {meal.prep_time_minutes + meal.cook_time_minutes} min
            {meal.extra_needed && meal.extra_needed.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-auto">
                +{meal.extra_needed.length} extra items
              </Badge>
            )}
          </div>

          {/* Tags */}
          {meal.dietary_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meal.dietary_tags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Expand/Collapse */}
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                {ingredients.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Ingredients:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {ingredients.map((ing, i) => <li key={i}>• {ing}</li>)}
                    </ul>
                  </div>
                )}
                {meal.instructions && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Instructions:</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{meal.instructions}</p>
                  </div>
                )}
                {meal.extra_needed && meal.extra_needed.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">You'll also need:</p>
                    <div className="flex flex-wrap gap-1">
                      {meal.extra_needed.map(item => (
                        <Badge key={item} variant="outline" className="text-[10px]">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs flex-1" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Less" : "Details"}
            </Button>
            <Button size="sm" className="text-xs flex-1" onClick={() => onAdd(meal)}>
              <Plus className="h-3 w-3 mr-1" /> Add to Plan
            </Button>
          </div>
        </CardContent>
      </InteractiveCard>
    </motion.div>
  );
};

// ──────────────── Main Page ────────────────
const Nutrition = () => {
  const [settings, setSettings] = useState<NutritionSettings>(loadSettings());
  const [activeTab, setActiveTab] = useState("meals");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, AIMealSuggestion[]>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [newIngredient, setNewIngredient] = useState("");
  const [consumedMeals, setConsumedMeals] = useState<AIMealSuggestion[]>([]);

  // Computed totals
  const totals = consumedMeals.reduce((acc, m) => ({
    calories: acc.calories + m.calories_per_serving,
    protein: acc.protein + m.protein_grams,
    carbs: acc.carbs + m.carbs_grams,
    fat: acc.fat + m.fat_grams,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const calPct = Math.min((totals.calories / settings.targetCalories) * 100, 100);

  if (!settings.setupComplete) {
    return <SetupWizard onComplete={(s) => setSettings(s)} />;
  }

  const generateSuggestions = async (mealType: string) => {
    setIsGenerating(mealType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      const { data, error } = await supabase.functions.invoke("generate-meal-suggestions", {
        body: {
          userProfile: profile,
          mealType,
          date: format(new Date(), "yyyy-MM-dd"),
          calorieTarget: settings.targetCalories,
          dietGoal: settings.dietGoal,
          availableIngredients: settings.availableIngredients,
        },
      });

      if (error) throw error;
      setSuggestions(prev => ({ ...prev, [mealType]: data.suggestions }));
      toast.success(`Got ${data.suggestions.length} ${mealType} ideas!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate suggestions");
    } finally {
      setIsGenerating(null);
    }
  };

  const addToConsumed = (meal: AIMealSuggestion) => {
    setConsumedMeals(prev => [...prev, meal]);
    toast.success(`Added ${meal.name} to today's log`);
  };

  const removeFromConsumed = (index: number) => {
    setConsumedMeals(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredients = (ingredients: string[]) => {
    const updated = { ...settings, availableIngredients: ingredients };
    setSettings(updated);
    saveSettings(updated);
  };

  const addIngredient = () => {
    const item = newIngredient.trim();
    if (!item || settings.availableIngredients.includes(item)) return;
    updateIngredients([...settings.availableIngredients, item]);
    setNewIngredient("");
  };

  const resetSetup = () => {
    const reset = { ...DEFAULT_SETTINGS };
    saveSettings(reset);
    setSettings(reset);
  };

  const mealTypes = [
    { id: "breakfast", label: "Breakfast", emoji: "🌅" },
    { id: "lunch", label: "Lunch", emoji: "☀️" },
    { id: "dinner", label: "Dinner", emoji: "🌙" },
    { id: "snack", label: "Snack", emoji: "🍎" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Header */}
        <MotionFadeIn className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-heading">Nutrition</h1>
            <p className="text-xs text-muted-foreground">
              {settings.dietGoal === "cut" ? "Cutting" : settings.dietGoal === "bulk" ? "Bulking" : "Maintaining"} • {settings.targetCalories} kcal target
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="h-5 w-5" />
          </Button>
        </MotionFadeIn>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Card className="border-0 shadow-sm bg-muted/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Settings</h3>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={resetSetup}>Reset Setup</Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Maintenance: {settings.maintenanceCalories} kcal</Label>
                    <Slider
                      value={[settings.maintenanceCalories]}
                      onValueChange={([v]) => {
                        const modifier = GOAL_OPTIONS.find(g => g.id === settings.dietGoal)!.modifier;
                        const updated = { ...settings, maintenanceCalories: v, targetCalories: v + modifier };
                        setSettings(updated);
                        saveSettings(updated);
                      }}
                      min={1200} max={4000} step={50}
                    />
                  </div>

                  <div className="flex gap-2">
                    {GOAL_OPTIONS.map(g => (
                      <Button
                        key={g.id}
                        variant={settings.dietGoal === g.id ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          const target = settings.maintenanceCalories + g.modifier;
                          const protein = Math.round(g.id === "cut" ? target * 0.4 / 4 : g.id === "bulk" ? target * 0.3 / 4 : target * 0.25 / 4);
                          const fat = Math.round(target * 0.25 / 9);
                          const carbs = Math.round((target - protein * 4 - fat * 9) / 4);
                          const updated = { ...settings, dietGoal: g.id, targetCalories: target, proteinTarget: protein, carbsTarget: carbs, fatTarget: fat };
                          setSettings(updated);
                          saveSettings(updated);
                        }}
                      >
                        {g.label}
                      </Button>
                    ))}
                  </div>

                  {/* Ingredients management */}
                  <div className="space-y-2">
                    <Label className="text-xs">My Ingredients</Label>
                    <div className="flex gap-2">
                      <Input value={newIngredient} onChange={e => setNewIngredient(e.target.value)} placeholder="Add ingredient..." className="h-9 text-sm" onKeyDown={e => e.key === "Enter" && addIngredient()} />
                      <Button size="sm" variant="secondary" onClick={addIngredient}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {settings.availableIngredients.map(item => (
                        <Badge key={item} variant="secondary" className="text-xs cursor-pointer gap-1" onClick={() => updateIngredients(settings.availableIngredients.filter(i => i !== item))}>
                          {item} <X className="h-2.5 w-2.5" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Progress */}
        <MotionFadeIn delay={0.1}>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Calorie bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-primary" /> Calories
                  </span>
                  <span className="text-muted-foreground">
                    {totals.calories} / {settings.targetCalories} kcal
                  </span>
                </div>
                <Progress value={calPct} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">
                  {settings.targetCalories - totals.calories > 0
                    ? `${settings.targetCalories - totals.calories} kcal remaining`
                    : `${totals.calories - settings.targetCalories} kcal over target`}
                </p>
              </div>

              {/* Macro rings */}
              <div className="grid grid-cols-3 gap-2">
                <MacroRing label="Protein" current={totals.protein} target={settings.proteinTarget} color="hsl(var(--primary))" icon={Beef} />
                <MacroRing label="Carbs" current={totals.carbs} target={settings.carbsTarget} color="hsl(var(--secondary))" icon={Wheat} />
                <MacroRing label="Fat" current={totals.fat} target={settings.fatTarget} color="hsl(var(--accent))" icon={Droplets} />
              </div>
            </CardContent>
          </Card>
        </MotionFadeIn>

        {/* Consumed meals */}
        {consumedMeals.length > 0 && (
          <MotionFadeIn delay={0.15}>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Log</h2>
              {consumedMeals.map((meal, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{meal.name}</p>
                      <p className="text-xs text-muted-foreground">{meal.calories_per_serving} kcal • P:{meal.protein_grams}g C:{meal.carbs_grams}g F:{meal.fat_grams}g</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromConsumed(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </MotionFadeIn>
        )}

        {/* Meal suggestions */}
        <MotionFadeIn delay={0.2}>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              AI Meal Suggestions
            </h2>
            {settings.availableIngredients.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-[10px] text-muted-foreground">Using:</span>
                {settings.availableIngredients.slice(0, 6).map(item => (
                  <Badge key={item} variant="outline" className="text-[10px] px-1.5 py-0">{item}</Badge>
                ))}
                {settings.availableIngredients.length > 6 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{settings.availableIngredients.length - 6} more</Badge>
                )}
              </div>
            )}

            {mealTypes.map(mt => (
              <div key={mt.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span>{mt.emoji}</span> {mt.label}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => generateSuggestions(mt.id)}
                    disabled={isGenerating !== null}
                  >
                    {isGenerating === mt.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    Suggest
                  </Button>
                </div>

                {suggestions[mt.id] ? (
                  <div className="space-y-2">
                    {suggestions[mt.id].map((meal, i) => (
                      <AIMealCard key={i} meal={meal} onAdd={addToConsumed} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-0 shadow-sm bg-muted/20">
                    <CardContent className="py-6 text-center">
                      <p className="text-xs text-muted-foreground">Tap "Suggest" for AI-powered {mt.label.toLowerCase()} ideas</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </MotionFadeIn>
      </div>
    </div>
  );
};

export default Nutrition;
