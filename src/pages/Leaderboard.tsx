import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trophy, Medal, Crown, Flame, Star, Users, Globe, TrendingUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MotionHeader, MotionFadeIn, MotionList, MotionItem } from "@/components/motion/MotionWrappers";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  achievement_count: number;
  rank: number;
}

interface Community {
  id: string;
  name: string;
}

interface UserRank {
  global_rank: number;
  total_users: number;
}

const Leaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [communityLeaderboard, setCommunityLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("global");

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (selectedCommunity) {
      fetchCommunityLeaderboard(selectedCommunity);
    }
  }, [selectedCommunity]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await Promise.all([
        fetchGlobalLeaderboard(),
        fetchUserCommunities(user.id),
        fetchUserRank(user.id)
      ]);
    }
    setLoading(false);
  };

  const fetchGlobalLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_global_leaderboard', {
        limit_count: 50
      });

      if (error) throw error;
      setGlobalLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
      toast.error('Failed to load leaderboard');
    }
  };

  const fetchCommunityLeaderboard = async (communityId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_community_leaderboard', {
        community_uuid: communityId,
        limit_count: 50
      });

      if (error) throw error;
      setCommunityLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching community leaderboard:', error);
      toast.error('Failed to load community leaderboard');
    }
  };

  const fetchUserCommunities = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('community:communities(id, name)')
        .eq('user_id', uid);

      if (error) throw error;
      
      const communityList = data
        ?.map(item => item.community as unknown as Community)
        .filter(Boolean) || [];
      
      setCommunities(communityList);
      if (communityList.length > 0) {
        setSelectedCommunity(communityList[0].id);
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const fetchUserRank = async (uid: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_rank', {
        target_user_id: uid
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setUserRank(data[0]);
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBgClass = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-primary/10 border-primary";
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/10 to-orange-600/10 border-amber-600/30";
      default:
        return "bg-card hover:bg-muted/50";
    }
  };

  const LeaderboardList = ({ entries, showCommunityBadge = false }: { entries: LeaderboardEntry[], showCommunityBadge?: boolean }) => (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No users found</p>
        </div>
      ) : (
        entries.map((entry) => {
          const isCurrentUser = entry.user_id === userId;
          return (
            <Card 
              key={entry.user_id} 
              className={`transition-all ${getRankBgClass(entry.rank, isCurrentUser)} ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {entry.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate text-sm sm:text-base">
                        {entry.full_name || 'Anonymous User'}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Level {entry.current_level}
                      </span>
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {entry.current_streak}d
                        </span>
                      )}
                      <span className="hidden sm:flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {entry.achievement_count}
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg sm:text-xl">
                      {entry.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-2xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold font-heading flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Compete with the community and climb the ranks
          </p>
        </div>

        {/* User's Current Rank Card */}
        {userRank && userRank.global_rank > 0 && (
          <Card className="mb-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Global Rank</p>
                    <p className="text-2xl font-bold text-primary">
                      #{userRank.global_rank}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Out of</p>
                  <p className="text-lg font-semibold">{userRank.total_users} users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="global" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <Globe className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <Users className="h-4 w-4" />
              Communities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Top 50 Users
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Compete with users from around the world
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <LeaderboardList entries={globalLeaderboard} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            {communities.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">You're not in any communities yet</p>
                  <Button variant="outline" onClick={() => window.location.href = '/communities'}>
                    Browse Communities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a community" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map((community) => (
                      <SelectItem key={community.id} value={community.id}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Community Rankings
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      See how you rank among your community members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <LeaderboardList entries={communityLeaderboard} showCommunityBadge />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <Card className="mt-4">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs font-medium mb-2 text-muted-foreground">How to earn points:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Complete workouts (50-100 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span>Meditation sessions (25-70 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Log daily mood (10 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Earn achievements (bonus pts)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Leaderboard;