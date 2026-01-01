import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userProfile, mealType, date } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a nutrition expert AI assistant. Generate personalized meal suggestions based on user preferences and health goals.`;

    const userPrompt = `Generate 3 healthy ${mealType} meal suggestions for ${date} based on this user profile:
    
Dietary Preferences: ${userProfile.dietary_preferences?.join(', ') || 'None specified'}
Health Goals: ${userProfile.health_goals?.join(', ') || 'General wellness'}
Fitness Level: ${userProfile.fitness_level || 'Moderate'}
Medical Conditions: ${userProfile.medical_conditions?.join(', ') || 'None'}

For each meal, provide:
1. Name (creative and appealing)
2. Brief description (1-2 sentences)
3. Estimated calories per serving
4. Protein, carbs, fat, fiber in grams
5. Prep time and cook time in minutes
6. List of main ingredients
7. Brief cooking instructions
8. Dietary tags (vegetarian, vegan, gluten-free, dairy-free, low-carb, high-protein, etc.)

Format as JSON array with this structure:
[{
  "name": "string",
  "description": "string",
  "calories_per_serving": number,
  "protein_grams": number,
  "carbs_grams": number,
  "fat_grams": number,
  "fiber_grams": number,
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "ingredients": ["ingredient1", "ingredient2"],
  "instructions": "step by step instructions",
  "dietary_tags": ["tag1", "tag2"],
  "meal_type": "${mealType}"
}]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from the response
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