export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      breathing_exercises: {
        Row: {
          benefits: string[] | null
          created_at: string
          cycles: number | null
          description: string
          difficulty_level: string
          duration_minutes: number
          exhale_seconds: number
          hold_seconds: number | null
          id: string
          inhale_seconds: number
          instructions: string
          name: string
          rest_seconds: number | null
          technique_type: string
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string
          cycles?: number | null
          description: string
          difficulty_level: string
          duration_minutes: number
          exhale_seconds: number
          hold_seconds?: number | null
          id?: string
          inhale_seconds: number
          instructions: string
          name: string
          rest_seconds?: number | null
          technique_type: string
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          created_at?: string
          cycles?: number | null
          description?: string
          difficulty_level?: string
          duration_minutes?: number
          exhale_seconds?: number
          hold_seconds?: number | null
          id?: string
          inhale_seconds?: number
          instructions?: string
          name?: string
          rest_seconds?: number | null
          technique_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          image_url: string | null
          is_private: boolean | null
          member_count: number | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          member_count?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          member_count?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          post_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          post_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          post_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          community_id: string | null
          created_at: string
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activities: {
        Row: {
          activity_type: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_ai_recommended: boolean | null
          priority: string | null
          scheduled_date: string
          scheduled_time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_ai_recommended?: boolean | null
          priority?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_ai_recommended?: boolean | null
          priority?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          event_id: string
          id: string
          rsvp_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          rsvp_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          rsvp_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          community_id: string
          created_at: string
          creator_id: string
          current_participants: number | null
          description: string | null
          end_time: string
          event_type: string
          id: string
          image_url: string | null
          location: string | null
          location_lat: number | null
          location_lng: number | null
          max_participants: number | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          creator_id: string
          current_participants?: number | null
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          image_url?: string | null
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_participants?: number | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          creator_id?: string
          current_participants?: number | null
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          image_url?: string | null
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_participants?: number | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          calories_burned: number | null
          created_at: string | null
          description: string | null
          difficulty_level: string
          duration_minutes: number | null
          equipment_needed: string[] | null
          id: string
          instructions: string
          muscle_groups: string[]
          name: string
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string | null
          description?: string | null
          difficulty_level: string
          duration_minutes?: number | null
          equipment_needed?: string[] | null
          id?: string
          instructions: string
          muscle_groups: string[]
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          calories_burned?: number | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string
          duration_minutes?: number | null
          equipment_needed?: string[] | null
          id?: string
          instructions?: string
          muscle_groups?: string[]
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      goal_interactions: {
        Row: {
          content: string | null
          created_at: string | null
          goal_id: string
          id: string
          interaction_type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          goal_id: string
          id?: string
          interaction_type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          goal_id?: string
          id?: string
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_interactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "shared_goals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_interactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "user_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          goal_id: string
          id: string
          milestone_value: number
          notes: string | null
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          goal_id: string
          id?: string
          milestone_value: number
          notes?: string | null
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          goal_id?: string
          id?: string
          milestone_value?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "shared_goals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "user_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_shares: {
        Row: {
          created_at: string | null
          goal_id: string
          id: string
          shared_with_id: string | null
          shared_with_type: string
        }
        Insert: {
          created_at?: string | null
          goal_id: string
          id?: string
          shared_with_id?: string | null
          shared_with_type: string
        }
        Update: {
          created_at?: string | null
          goal_id?: string
          id?: string
          shared_with_id?: string | null
          shared_with_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_shares_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "shared_goals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_shares_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "user_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      meditation_programs: {
        Row: {
          audio_url: string | null
          benefits: string[] | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string
          duration_minutes: number
          id: string
          instructions: string
          is_guided: boolean | null
          is_public: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          voice_gender: string | null
        }
        Insert: {
          audio_url?: string | null
          benefits?: string[] | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level: string
          duration_minutes: number
          id?: string
          instructions: string
          is_guided?: boolean | null
          is_public?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          voice_gender?: string | null
        }
        Update: {
          audio_url?: string | null
          benefits?: string[] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          duration_minutes?: number
          id?: string
          instructions?: string
          is_guided?: boolean | null
          is_public?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          voice_gender?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_interests: string[] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          dietary_preferences: string[] | null
          email: string
          fitness_level: string | null
          full_name: string | null
          gender: string | null
          health_goals: string[] | null
          id: string
          location: string | null
          medical_conditions: string[] | null
          notification_preferences: Json | null
          privacy_settings: Json | null
          updated_at: string
        }
        Insert: {
          activity_interests?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_preferences?: string[] | null
          email: string
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          health_goals?: string[] | null
          id: string
          location?: string | null
          medical_conditions?: string[] | null
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          updated_at?: string
        }
        Update: {
          activity_interests?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_preferences?: string[] | null
          email?: string
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          health_goals?: string[] | null
          id?: string
          location?: string | null
          medical_conditions?: string[] | null
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_grams: number | null
          cook_time_minutes: number | null
          created_at: string
          created_by: string | null
          cuisine_type: string | null
          description: string | null
          dietary_tags: string[] | null
          fat_grams: number | null
          fiber_grams: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: string
          is_public: boolean | null
          meal_type: string
          name: string
          prep_time_minutes: number | null
          protein_grams: number | null
          servings: number | null
          updated_at: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_grams?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          fat_grams?: number | null
          fiber_grams?: number | null
          id?: string
          image_url?: string | null
          ingredients: Json
          instructions: string
          is_public?: boolean | null
          meal_type: string
          name: string
          prep_time_minutes?: number | null
          protein_grams?: number | null
          servings?: number | null
          updated_at?: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_grams?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          fat_grams?: number | null
          fiber_grams?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: string
          is_public?: boolean | null
          meal_type?: string
          name?: string
          prep_time_minutes?: number | null
          protein_grams?: number | null
          servings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_custom_workouts: {
        Row: {
          completion_count: number | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          last_completed_at: string | null
          user_id: string
          workout_id: string
        }
        Insert: {
          completion_count?: number | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          last_completed_at?: string | null
          user_id: string
          workout_id: string
        }
        Update: {
          completion_count?: number | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          last_completed_at?: string | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          description: string | null
          end_date: string
          goal_type: string
          id: string
          is_public: boolean | null
          priority: string | null
          start_date: string
          status: string | null
          target_value: number
          title: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          end_date: string
          goal_type: string
          id?: string
          is_public?: boolean | null
          priority?: string | null
          start_date?: string
          status?: string | null
          target_value: number
          title: string
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          is_public?: boolean | null
          priority?: string | null
          start_date?: string
          status?: string | null
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_meal_plans: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          meal_type: string
          notes: string | null
          planned_date: string
          recipe_id: string
          servings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          meal_type: string
          notes?: string | null
          planned_date: string
          recipe_id: string
          servings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          meal_type?: string
          notes?: string | null
          planned_date?: string
          recipe_id?: string
          servings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_meal_plans_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_meditation_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          duration_minutes: number
          exercise_id: string | null
          id: string
          mood_after: string | null
          mood_before: string | null
          notes: string | null
          program_id: string | null
          session_date: string
          session_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          duration_minutes: number
          exercise_id?: string | null
          id?: string
          mood_after?: string | null
          mood_before?: string | null
          notes?: string | null
          program_id?: string | null
          session_date?: string
          session_type: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          duration_minutes?: number
          exercise_id?: string | null
          id?: string
          mood_after?: string | null
          mood_before?: string | null
          notes?: string | null
          program_id?: string | null
          session_date?: string
          session_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_meditation_sessions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "breathing_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_meditation_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "meditation_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string
          id: string
          image_url: string | null
          is_public: boolean | null
          name: string
          total_duration_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level: string
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          name: string
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          name?: string
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      shared_goals_view: {
        Row: {
          cheer_count: number | null
          comment_count: number | null
          created_at: string | null
          current_value: number | null
          description: string | null
          end_date: string | null
          goal_type: string | null
          id: string | null
          is_public: boolean | null
          owner_avatar: string | null
          owner_name: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          target_value: number | null
          title: string | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_profile_info: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_public_profiles_info: {
        Args: { profile_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_user_community_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_community_ids_by_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: string[]
      }
      get_user_conversation_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_community_role: {
        Args: { _community_id: string; _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
