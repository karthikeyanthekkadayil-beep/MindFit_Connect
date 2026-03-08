import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GamificationStats {
  total_points: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
  requirement_type: string;
  requirement_value: number;
  badge_color: string;
  is_active: boolean;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievement: Achievement;
}

interface PointTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

// Level thresholds - points needed for each level
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  800,    // Level 5
  1200,   // Level 6
  1700,   // Level 7
  2300,   // Level 8
  3000,   // Level 9
  3800,   // Level 10
  4700,   // Level 11
  5700,   // Level 12
  6800,   // Level 13
  8000,   // Level 14
  9300,   // Level 15
  10700,  // Level 16
  12200,  // Level 17
  13800,  // Level 18
  15500,  // Level 19
  17300,  // Level 20
  19200,  // Level 21
  21200,  // Level 22
  23300,  // Level 23
  25500,  // Level 24
  27800,  // Level 25
];

export const useGamification = (userId: string | null) => {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<UserAchievement[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateLevel = (points: number): number => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (points >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  };

  const getPointsForNextLevel = (currentLevel: number): number => {
    if (currentLevel >= LEVEL_THRESHOLDS.length) {
      return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (currentLevel - LEVEL_THRESHOLDS.length + 1) * 2500;
    }
    return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  };

  const getPointsForCurrentLevel = (currentLevel: number): number => {
    if (currentLevel <= 1) return 0;
    if (currentLevel > LEVEL_THRESHOLDS.length) {
      return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (currentLevel - LEVEL_THRESHOLDS.length) * 2500;
    }
    return LEVEL_THRESHOLDS[currentLevel - 1];
  };

  const fetchGamificationData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch or create user stats
      let { data: statsData, error: statsError } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code === 'PGRST116') {
        // No stats exist, create them
        const { data: newStats, error: createError } = await supabase
          .from('user_gamification')
          .insert({ user_id: userId })
          .select()
          .single();

        if (createError) throw createError;
        statsData = newStats;
      } else if (statsError) {
        throw statsError;
      }

      setStats(statsData);

      // Fetch all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('requirement_value', { ascending: true });

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Fetch user's earned achievements
      const { data: earnedData, error: earnedError } = await supabase
        .from('user_achievements')
        .select(`
          id,
          achievement_id,
          earned_at,
          achievement:achievements(*)
        `)
        .eq('user_id', userId);

      if (earnedError) throw earnedError;
      setEarnedAchievements(earnedData as unknown as UserAchievement[] || []);

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;
      setRecentTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  const awardPoints = async (
    points: number,
    transactionType: string,
    description: string,
    referenceId?: string,
    referenceType?: string
  ) => {
    if (!userId || !stats) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const isNewDay = stats.last_activity_date !== today;
      
      // Calculate new streak
      let newStreak = stats.current_streak;
      if (isNewDay) {
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        if (stats.last_activity_date === yesterday) {
          newStreak = stats.current_streak + 1;
        } else if (stats.last_activity_date !== today) {
          newStreak = 1;
        }
      }

      const newTotalPoints = stats.total_points + points;
      const newLevel = calculateLevel(newTotalPoints);
      const leveledUp = newLevel > stats.current_level;

      // Use secure RPC to add points (validates on server)
      const { error: pointsError } = await supabase.rpc('add_points', {
        _user_id: userId,
        _points: points,
        _transaction_type: transactionType,
        _description: description,
        _reference_type: referenceType || null,
        _reference_id: referenceId || null,
      });

      if (pointsError) throw pointsError;

      // Update streak and level (user can only update their own row via RLS)
      const { error: updateError } = await supabase
        .from('user_gamification')
        .update({
          current_level: newLevel,
          current_streak: newStreak,
          longest_streak: Math.max(stats.longest_streak, newStreak),
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Show toast notifications
      toast.success(`+${points} points!`, { description });

      if (leveledUp) {
        toast.success(`🎉 Level Up!`, { description: `You've reached level ${newLevel}!` });
      }

      if (isNewDay && newStreak > 1) {
        toast.success(`🔥 ${newStreak} day streak!`);
      }

      // Refresh data
      fetchGamificationData();

      // Check for new achievements
      await checkAchievements();

    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const checkAchievements = async () => {
    if (!userId) return;

    try {
      // Get user activity counts
      const [
        { count: workoutsCount },
        { count: meditationsCount },
        { count: communitiesCount },
        { count: eventsCount },
        { count: moodEntriesCount },
      ] = await Promise.all([
        supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
        supabase.from('user_meditation_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true),
        supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('event_rsvps').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('mood_stress_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      const earnedIds = earnedAchievements.map(ea => ea.achievement_id);
      const userStats = stats;

      for (const achievement of achievements) {
        if (earnedIds.includes(achievement.id)) continue;

        let isEarned = false;

        switch (achievement.requirement_type) {
          case 'workouts_completed':
            isEarned = (workoutsCount || 0) >= achievement.requirement_value;
            break;
          case 'meditations_completed':
            isEarned = (meditationsCount || 0) >= achievement.requirement_value;
            break;
          case 'communities_joined':
            isEarned = (communitiesCount || 0) >= achievement.requirement_value;
            break;
          case 'events_attended':
            isEarned = (eventsCount || 0) >= achievement.requirement_value;
            break;
          case 'mood_entries':
            isEarned = (moodEntriesCount || 0) >= achievement.requirement_value;
            break;
          case 'streak_days':
            isEarned = (userStats?.current_streak || 0) >= achievement.requirement_value;
            break;
          case 'level_reached':
            isEarned = (userStats?.current_level || 1) >= achievement.requirement_value;
            break;
        }

        if (isEarned) {
          // Award achievement via secure RPC (validates requirements server-side)
          const { data: awarded, error } = await supabase.rpc('award_achievement', {
            _user_id: userId,
            _achievement_id: achievement.id,
          });

          if (!error) {
            toast.success(`🏆 Achievement Unlocked!`, {
              description: `${achievement.name}: ${achievement.description}`,
            });

            // Award bonus points for the achievement
            if (achievement.points_reward > 0) {
              await awardPoints(
                achievement.points_reward,
                'achievement',
                `Achievement: ${achievement.name}`,
                achievement.id,
                'achievement'
              );
            }
          }
        }
      }

      fetchGamificationData();
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const getLevelProgress = () => {
    if (!stats) return { current: 0, next: 100, percentage: 0 };
    
    const currentLevelPoints = getPointsForCurrentLevel(stats.current_level);
    const nextLevelPoints = getPointsForNextLevel(stats.current_level);
    const progressPoints = stats.total_points - currentLevelPoints;
    const neededPoints = nextLevelPoints - currentLevelPoints;
    const percentage = Math.min(100, Math.round((progressPoints / neededPoints) * 100));

    return {
      current: progressPoints,
      next: neededPoints,
      percentage,
    };
  };

  return {
    stats,
    achievements,
    earnedAchievements,
    recentTransactions,
    loading,
    awardPoints,
    checkAchievements,
    getLevelProgress,
    refresh: fetchGamificationData,
  };
};
