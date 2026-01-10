import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user data
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user profile with health information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    // Get available workouts
    const { data: workouts, error: workoutsError } = await supabaseClient
      .from('workouts')
      .select('id, name, description, difficulty_level, category, total_duration_minutes')
      .eq('is_public', true)
      .order('name');

    if (workoutsError) {
      console.error('Workouts error:', workoutsError);
      throw workoutsError;
    }

    // Get user's workout history (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: workoutHistory } = await supabaseClient
      .from('user_custom_workouts')
      .select('workout_id, completion_count, last_completed_at')
      .eq('user_id', user.id)
      .gte('last_completed_at', twoWeeksAgo.toISOString());

    // Build context for AI
    const context = `
User Physical Profile:
- Fitness Level: ${profile.fitness_level || 'Not specified'}
- Medical Conditions: ${profile.medical_conditions?.length ? profile.medical_conditions.join(', ') : 'None reported'}
- Health Goals: ${profile.health_goals?.length ? profile.health_goals.join(', ') : 'Not specified'}
- Activity Interests: ${profile.activity_interests?.length ? profile.activity_interests.join(', ') : 'Not specified'}
- Dietary Preferences: ${profile.dietary_preferences?.length ? profile.dietary_preferences.join(', ') : 'Not specified'}

Available Workouts:
${workouts?.map(w => `- ID: ${w.id}, Name: "${w.name}", Difficulty: ${w.difficulty_level}, Category: ${w.category}, Duration: ${w.total_duration_minutes}min, Description: ${w.description || 'N/A'}`).join('\n') || 'No workouts available'}

Recent Workout History (Last 14 days):
${workoutHistory?.length ? workoutHistory.map(h => `- Workout ID: ${h.workout_id}, Completed: ${h.completion_count} times`).join('\n') : 'No recent workout history'}
`;

    const systemPrompt = `You are a certified fitness trainer and physical therapist AI assistant. Your role is to recommend safe, effective workouts based on the user's physical condition, medical history, and fitness goals.

CRITICAL SAFETY RULES:
1. ALWAYS consider medical conditions when recommending workouts
2. For users with injuries or chronic conditions, suggest low-impact alternatives
3. Match difficulty level to the user's fitness level
4. Avoid recommending workouts that could aggravate existing conditions
5. Prioritize variety to prevent overtraining specific muscle groups
6. Consider recent workout history to avoid fatigue

RECOMMENDATION CRITERIA:
- Beginner users: Recommend beginner/intermediate workouts only
- Users with joint issues: Avoid high-impact exercises
- Users with heart conditions: Recommend low to moderate intensity
- Users with back problems: Avoid heavy lifting, recommend core strengthening
- Always provide reasoning for each recommendation

Select 3-5 workouts from the available list that best match the user's profile. Only recommend workouts that exist in the available workouts list.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable AI key not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_workouts",
            description: "Recommend personalized workouts based on user's physical condition",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      workout_id: { 
                        type: "string", 
                        description: "The ID of the recommended workout from the available list" 
                      },
                      reasoning: { 
                        type: "string", 
                        description: "Why this workout is suitable for the user's physical condition (1-2 sentences)" 
                      },
                      safety_notes: { 
                        type: "string", 
                        description: "Any modifications or precautions the user should take based on their medical conditions" 
                      },
                      priority: { 
                        type: "number", 
                        description: "Priority ranking from 1 (highest) to 5 (lowest)" 
                      }
                    },
                    required: ["workout_id", "reasoning", "priority"]
                  }
                },
                overall_advice: {
                  type: "string",
                  description: "General fitness advice based on the user's physical condition (2-3 sentences)"
                },
                cautions: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of things the user should be careful about based on their medical conditions"
                }
              },
              required: ["recommendations", "overall_advice"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_workouts" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Enrich recommendations with full workout data
    const enrichedRecommendations = result.recommendations
      .map((rec: any) => {
        const workout = workouts?.find(w => w.id === rec.workout_id);
        if (!workout) return null;
        return {
          ...rec,
          workout
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.priority - b.priority);

    return new Response(
      JSON.stringify({
        recommendations: enrichedRecommendations,
        overall_advice: result.overall_advice,
        cautions: result.cautions || [],
        user_profile: {
          fitness_level: profile.fitness_level,
          medical_conditions: profile.medical_conditions,
          health_goals: profile.health_goals
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-workout-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
