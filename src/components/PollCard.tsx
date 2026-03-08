import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Check, Trash2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Poll {
  id: string;
  community_id: string;
  user_id: string;
  question: string;
  options: string[];
  is_multiple_choice: boolean;
  expires_at: string | null;
  created_at: string;
  profile?: { id: string; full_name: string; avatar_url: string } | null;
}

interface PollCardProps {
  poll: Poll;
  currentUserId: string | null;
}

export const PollCard = ({ poll, currentUserId }: PollCardProps) => {
  const queryClient = useQueryClient();
  const options = Array.isArray(poll.options) ? poll.options : [];

  const { data: votes } = useQuery({
    queryKey: ["poll-votes", poll.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", poll.id);
      if (error) throw error;
      return data || [];
    },
  });

  const userVotes = votes?.filter((v) => v.user_id === currentUserId) || [];
  const hasVoted = userVotes.length > 0;
  const totalVotes = votes?.length || 0;
  const uniqueVoters = new Set(votes?.map((v) => v.user_id)).size;

  const voteCounts = options.map(
    (_, idx) => votes?.filter((v) => v.option_index === idx).length || 0
  );

  const voteMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const existingVote = userVotes.find((v) => v.option_index === optionIndex);

      if (existingVote) {
        // Remove vote
        const { error } = await supabase
          .from("poll_votes")
          .delete()
          .eq("id", existingVote.id);
        if (error) throw error;
      } else {
        // For single choice, remove existing votes first
        if (!poll.is_multiple_choice && userVotes.length > 0) {
          for (const v of userVotes) {
            await supabase.from("poll_votes").delete().eq("id", v.id);
          }
        }
        const { error } = await supabase.from("poll_votes").insert({
          poll_id: poll.id,
          user_id: currentUserId,
          option_index: optionIndex,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
    },
    onError: () => {
      toast.error("Failed to submit vote");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("polls").delete().eq("id", poll.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-polls", poll.community_id] });
      toast.success("Poll deleted");
    },
  });

  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={poll.profile?.avatar_url || ""} />
              <AvatarFallback>{poll.profile?.full_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {poll.profile?.full_name || "Unknown"}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                </span>
                <Badge variant="outline" className="gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Poll
                </Badge>
                {poll.is_multiple_choice && (
                  <Badge variant="secondary" className="text-xs">Multiple</Badge>
                )}
              </div>
            </div>
          </div>
          {currentUserId === poll.user_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <h3 className="font-semibold text-lg text-foreground">{poll.question}</h3>

        <div className="space-y-2">
          {options.map((option, idx) => {
            const count = voteCounts[idx];
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = userVotes.some((v) => v.option_index === idx);

            return (
              <button
                key={idx}
                onClick={() => !isExpired && voteMutation.mutate(idx)}
                disabled={isExpired || voteMutation.isPending}
                className={cn(
                  "w-full relative rounded-xl border p-3 text-left transition-all",
                  "hover:border-primary/50",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card"
                )}
              >
                {/* Background progress bar */}
                {hasVoted && (
                  <div
                    className="absolute inset-0 rounded-xl bg-primary/10 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className={cn("text-sm", isSelected && "font-medium text-foreground")}>
                      {String(option)}
                    </span>
                  </div>
                  {hasVoted && (
                    <span className="text-sm font-medium text-muted-foreground ml-2 shrink-0">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Users className="h-3.5 w-3.5" />
          <span>{uniqueVoters} {uniqueVoters === 1 ? "vote" : "votes"}</span>
          {isExpired && (
            <Badge variant="secondary" className="text-xs">Ended</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
