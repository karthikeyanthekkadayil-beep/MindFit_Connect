import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PollCard } from "@/components/PollCard";

interface CommunityPollsProps {
  communityId: string;
}

export const CommunityPolls = ({ communityId }: CommunityPollsProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const { data: polls, isLoading } = useQuery({
    queryKey: ["community-polls", communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase.rpc("get_public_profiles_info", {
        profile_ids: userIds,
      });

      return data?.map((poll) => ({
        ...poll,
        options: poll.options as string[],
        profile: profiles?.find((p) => p.id === poll.user_id) || null,
      }));
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading polls...</div>;
  }

  if (!polls || polls.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No polls yet. Create one to get the community's opinion!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} />
      ))}
    </div>
  );
};
