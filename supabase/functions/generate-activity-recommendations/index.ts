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
    const { date } = await req.json();
    
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

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    // Get past activities (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: pastActivities, error: activitiesError } = await supabaseClient
      .from('daily_activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: false });

    if (activitiesError) {
      console.error('Activities error:', activitiesError);
    }

    // Build context for AI
    const context = `
User Profile:
- Fitness Level: ${profile.fitness_level || 'Not specified'}
- Health Goals: ${profile.health_goals?.join(', ') || 'Not specified'}
- Medical Conditions: ${profile.medical_conditions?.join(', ') || 'None'}
- Dietary Preferences: ${profile.dietary_preferences?.join(', ') || 'Not specified'}
- Activity Interests: ${profile.activity_interests?.join(', ') || 'Not specified'}

Recent Activity History (Last 7 Days):
${pastActivities?.length ? pastActivities.map(a => 
  `- ${a.title} (${a.activity_type}) - ${a.completed ? 'Completed' : 'Not completed'}`
).join('\n') : 'No recent activities'}

Current Date: ${date}
`;

    const systemPrompt = `You are a health and wellness AI assistant. Generate 3-5 personalized activity recommendations for the user based on their profile and recent activity history.

Consider:
1. User's fitness level and medical conditions (adjust intensity accordingly)
2. Their health goals and interests
3. Variety in activity types (workout, meditation, nutrition, social)
4. Balance between challenge and achievability
5. Activities they haven't done recently

Return recommendations as a JSON array of activities.`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_activity_recommendations",
            description: "Generate personalized activity recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Activity title" },
                      description: { type: "string", description: "Brief description" },
                      activity_type: { 
                        type: "string", 
                        enum: ["workout", "meditation", "nutrition", "social", "custom"],
                        description: "Type of activity"
                      },
                      duration_minutes: { 
                        type: "number", 
                        description: "Suggested duration in minutes"
                      },
                      priority: { 
                        type: "string", 
                        enum: ["low", "medium", "high"],
                        description: "Recommended priority level"
                      },
                      scheduled_time: {
                        type: "string",
                        description: "Suggested time of day (HH:MM format, optional)"
                      }
                    },
                    required: ["title", "description", "activity_type", "duration_minutes", "priority"]
                  }
                }
              },
              required: ["recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_activity_recommendations" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const recommendations = JSON.parse(toolCall.function.arguments).recommendations;

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-activity-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
