import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;

    // Get available meditation programs
    const { data: programs } = await supabaseClient
      .from('meditation_programs')
      .select('id, title, description, category, difficulty_level, duration_minutes, benefits, tags, is_guided')
      .eq('is_public', true);

    // Get available breathing exercises
    const { data: exercises } = await supabaseClient
      .from('breathing_exercises')
      .select('id, name, description, technique_type, duration_minutes, difficulty_level, benefits');

    // Get recent mindfulness history
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: sessionHistory } = await supabaseClient
      .from('user_meditation_sessions')
      .select('session_type, program_id, exercise_id, duration_minutes, completed, session_date')
      .eq('user_id', user.id)
      .gte('session_date', twoWeeksAgo.toISOString())
      .order('session_date', { ascending: false });

    // Get recent mood data
    const { data: moodEntries } = await supabaseClient
      .from('mood_stress_entries')
      .select('mood_score, stress_level, mood_label')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(7);

    const context = `
User Profile:
- Fitness Level: ${profile.fitness_level || 'Not specified'}
- Medical Conditions: ${profile.medical_conditions?.length ? profile.medical_conditions.join(', ') : 'None reported'}
- Health Goals: ${profile.health_goals?.length ? profile.health_goals.join(', ') : 'Not specified'}
- Activity Interests: ${profile.activity_interests?.length ? profile.activity_interests.join(', ') : 'Not specified'}

Recent Mood & Stress (last 7 entries):
${moodEntries?.length ? moodEntries.map(m => `- Mood: ${m.mood_label} (${m.mood_score}/5), Stress: ${m.stress_level ?? 'N/A'}/5`).join('\n') : 'No mood data available'}

Available Meditation Programs:
${programs?.map(p => `- ID: ${p.id}, Title: "${p.title}", Category: ${p.category}, Difficulty: ${p.difficulty_level}, Duration: ${p.duration_minutes}min, Guided: ${p.is_guided}, Benefits: ${p.benefits?.join(', ') || 'N/A'}`).join('\n') || 'None available'}

Available Breathing Exercises:
${exercises?.map(e => `- ID: ${e.id}, Name: "${e.name}", Type: ${e.technique_type}, Difficulty: ${e.difficulty_level}, Duration: ${e.duration_minutes}min, Benefits: ${e.benefits?.join(', ') || 'N/A'}`).join('\n') || 'None available'}

Recent Session History (last 14 days):
${sessionHistory?.length ? sessionHistory.map(s => `- Type: ${s.session_type}, Duration: ${s.duration_minutes}min, Completed: ${s.completed}`).join('\n') : 'No recent sessions'}
`;

    const systemPrompt = `You are a certified mindfulness coach, mental health counselor, and wellness expert. Your role is to recommend safe, personalized meditation and breathing exercises based on the user's physical and mental health conditions.

CRITICAL SAFETY RULES:
1. ALWAYS consider medical conditions when recommending mindfulness practices
2. For users with anxiety disorders, recommend calming/grounding exercises, avoid intense breathwork
3. For users with respiratory conditions (asthma, COPD), recommend gentle breathing with no breath holding
4. For users with PTSD or trauma history, avoid body scan meditations that may trigger dissociation
5. For users with high blood pressure, recommend slow breathing, avoid vigorous pranayama
6. Match difficulty level to the user's experience and fitness level
7. Consider recent mood/stress levels to prioritize urgent mental health needs

RECOMMENDATION STRATEGY:
- High stress users: Prioritize calming breathing exercises and stress-relief meditations
- Low mood users: Recommend uplifting, gratitude, and loving-kindness meditations
- Beginners: Start with short guided sessions (5-10 min)
- Users with physical limitations: Recommend seated or lying meditation styles
- Provide a balanced mix of meditation programs and breathing exercises

Select 3-5 items (mix of meditation programs and breathing exercises) from the available lists that best match the user's profile.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('Lovable AI key not configured');

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
            name: "recommend_mindfulness",
            description: "Recommend personalized mindfulness activities based on user's condition",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item_id: { type: "string", description: "ID of the meditation program or breathing exercise" },
                      item_type: { type: "string", enum: ["meditation", "breathing"], description: "Type of recommendation" },
                      reasoning: { type: "string", description: "Why this is suitable for the user (1-2 sentences)" },
                      safety_notes: { type: "string", description: "Any modifications or precautions based on health conditions" },
                      priority: { type: "number", description: "Priority ranking 1 (highest) to 5 (lowest)" }
                    },
                    required: ["item_id", "item_type", "reasoning", "priority"],
                    additionalProperties: false
                  }
                },
                overall_advice: { type: "string", description: "Personalized mindfulness advice (2-3 sentences)" },
                cautions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Safety cautions based on health conditions"
                }
              },
              required: ["recommendations", "overall_advice"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_mindfulness" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call in response');

    const result = JSON.parse(toolCall.function.arguments);

    // Enrich recommendations with full data
    const enrichedRecommendations = result.recommendations
      .map((rec: any) => {
        if (rec.item_type === 'meditation') {
          const program = programs?.find(p => p.id === rec.item_id);
          if (!program) return null;
          return { ...rec, program };
        } else {
          const exercise = exercises?.find(e => e.id === rec.item_id);
          if (!exercise) return null;
          return { ...rec, exercise };
        }
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
        },
        mood_summary: moodEntries?.length ? {
          avg_mood: Math.round(moodEntries.reduce((s, m) => s + m.mood_score, 0) / moodEntries.length * 10) / 10,
          avg_stress: moodEntries.filter(m => m.stress_level != null).length > 0
            ? Math.round(moodEntries.filter(m => m.stress_level != null).reduce((s, m) => s + (m.stress_level ?? 0), 0) / moodEntries.filter(m => m.stress_level != null).length * 10) / 10
            : null
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-mindfulness-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
