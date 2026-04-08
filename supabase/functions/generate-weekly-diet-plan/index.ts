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
    const { calorieTarget, dietGoal, availableIngredients, dietaryPreferences, healthGoals, medicalConditions } = await req.json();

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
    const calories = calorieTarget || 2000;

    const ingredientsList = availableIngredients?.length > 0
      ? availableIngredients.join(', ')
      : 'Common pantry items (chicken, rice, eggs, vegetables, etc.)';

    const systemPrompt = `You are an elite sports nutritionist. Create practical, delicious weekly meal plans. Prioritize variety across the week while respecting the user's available ingredients and nutritional targets.`;

    const userPrompt = `Create a FULL 7-day meal plan (Monday through Sunday) with 4 meals each day (breakfast, lunch, dinner, snack).

USER CONTEXT:
- Daily Calorie Target: ${calories} kcal
- Diet Goal: ${goalDesc}
- Dietary Preferences: ${dietaryPreferences?.join(', ') || 'None'}
- Health Goals: ${healthGoals?.join(', ') || 'General wellness'}
- Medical Conditions: ${medicalConditions?.join(', ') || 'None'}

AVAILABLE INGREDIENTS:
${ingredientsList}

CALORIE DISTRIBUTION PER MEAL:
- Breakfast: ~${Math.round(calories * 0.25)} kcal
- Lunch: ~${Math.round(calories * 0.35)} kcal
- Dinner: ~${Math.round(calories * 0.30)} kcal
- Snack: ~${Math.round(calories * 0.10)} kcal

RULES:
- Use the listed ingredients as much as possible
- Ensure variety — don't repeat the same meal across days
- Keep meals practical and easy to prepare
- Each day's total should be close to ${calories} kcal
- Protein should be ${dietGoal === 'cut' ? '35-40%' : dietGoal === 'bulk' ? '30-35%' : '25-30%'} of daily calories

Return ONLY a JSON object with this exact structure:
{
  "Monday": {
    "breakfast": { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number },
    "lunch": { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number },
    "dinner": { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number },
    "snack": { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number }
  },
  "Tuesday": { ... },
  ...through "Sunday"
}`;

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
        temperature: 0.8,
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

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse weekly plan from AI response');
    }

    const weeklyPlan = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ weeklyPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-weekly-diet-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
