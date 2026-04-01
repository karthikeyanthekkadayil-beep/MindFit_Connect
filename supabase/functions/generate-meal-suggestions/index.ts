import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userProfile, mealType, date, calorieTarget, dietGoal, availableIngredients } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const goalDescriptions: Record<string, string> = {
      cut: 'fat loss / caloric deficit — prioritize high protein, high fiber, low calorie dense foods',
      bulk: 'muscle gain / caloric surplus — prioritize high protein, calorie dense nutrient-rich foods',
      maintain: 'weight maintenance — balanced macros with adequate protein',
    };

    const goalDesc = goalDescriptions[dietGoal] || goalDescriptions.maintain;

    const mealCalorieShare: Record<string, number> = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.30,
      snack: 0.10,
    };
    const targetForMeal = Math.round((calorieTarget || 2000) * (mealCalorieShare[mealType] || 0.3));

    const systemPrompt = `You are an elite sports nutritionist. You create practical, delicious meal plans using ONLY the ingredients the user has available. If critical ingredients are missing, suggest minimal additions. Always respect the user's calorie and macro targets.`;

    const ingredientsList = availableIngredients?.length > 0
      ? availableIngredients.join(', ')
      : 'Not specified — suggest common pantry-friendly meals';

    const userPrompt = `Create 3 ${mealType} meal options for ${date}.

USER CONTEXT:
- Daily Calorie Target: ${calorieTarget || 2000} kcal
- This ${mealType} should be ~${targetForMeal} kcal
- Diet Goal: ${goalDesc}
- Dietary Preferences: ${userProfile?.dietary_preferences?.join(', ') || 'None'}
- Health Goals: ${userProfile?.health_goals?.join(', ') || 'General wellness'}
- Medical Conditions: ${userProfile?.medical_conditions?.join(', ') || 'None'}
- Fitness Level: ${userProfile?.fitness_level || 'Moderate'}

AVAILABLE INGREDIENTS AT HOME:
${ingredientsList}

RULES:
- Use ONLY the listed ingredients as much as possible
- Each meal should be close to ${targetForMeal} kcal
- Protein should be ${dietGoal === 'cut' ? '40-50%' : dietGoal === 'bulk' ? '30-35%' : '25-30%'} of meal calories
- Keep instructions simple and practical (under 30 min prep when possible)

Return ONLY a JSON array:
[{
  "name": "string",
  "description": "string (1-2 sentences, appetizing)",
  "calories_per_serving": number,
  "protein_grams": number,
  "carbs_grams": number,
  "fat_grams": number,
  "fiber_grams": number,
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": 1,
  "ingredients": [{"item": "string", "amount": "string"}],
  "instructions": "string (numbered steps)",
  "dietary_tags": ["string"],
  "meal_type": "${mealType}",
  "uses_available": true,
  "extra_needed": ["string"] 
}]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse meal suggestions from AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-meal-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
