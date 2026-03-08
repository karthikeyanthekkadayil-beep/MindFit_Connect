import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Check, Trash2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatPollInlineProps {
  conversationId: string;
  currentUserId: string | null;
}

export const ChatPollInline = ({ conversationId, currentUserId }: ChatPollInlineProps) => {
  const queryClient = useQueryClient();

  const { data: polls } = useQuery({
    queryKey: ["chat-polls", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_polls")
        .select("*")
        .eq("conversation_id", conversationId)
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

  if (!polls || polls.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {polls.map((poll) => (
        <ChatPollCard
          key={poll.id}
          poll={poll}
          conversationId={conversationId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
};

interface ChatPollCardProps {
  poll: any;
  conversationId: string;
  currentUserId: string | null;
}

const ChatPollCard = ({ poll, conversationId, currentUserId }: ChatPollCardProps) => {
  const queryClient = useQueryClient();
  const options: string[] = Array.isArray(poll.options) ? poll.options : [];

  const { data: votes } = useQuery({
    queryKey: ["chat-poll-votes", poll.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_poll_votes")
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
        const { error } = await supabase
          .from("chat_poll_votes")
          .delete()
          .eq("id", existingVote.id);
        if (error) throw error;
      } else {
        if (!poll.is_multiple_choice && userVotes.length > 0) {
          for (const v of userVotes) {
            await supabase.from("chat_poll_votes").delete().eq("id", v.id);
          }
        }
        const { error } = await supabase.from("chat_poll_votes").insert({
          poll_id: poll.id,
          user_id: currentUserId,
          option_index: optionIndex,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-poll-votes", poll.id] });
    },
    onError: () => {
      toast.error("Failed to submit vote");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chat_polls").delete().eq("id", poll.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-polls", conversationId] });
      toast.success("Poll deleted");
    },
  });

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">{poll.question}</p>
              <p className="text-xs text-muted-foreground">
                by {poll.profile?.full_name || "Unknown"} · {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                {poll.is_multiple_choice && (
                  <Badge variant="secondary" className="ml-1 text-[10px] py-0">Multiple</Badge>
                )}
              </p>
            </div>
          </div>
          {currentUserId === poll.user_id && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          {options.map((option, idx) => {
            const count = voteCounts[idx];
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = userVotes.some((v) => v.option_index === idx);

            return (
              <button
                key={idx}
                onClick={() => voteMutation.mutate(idx)}
                disabled={voteMutation.isPending}
                className={cn(
                  "w-full relative rounded-lg border p-2 text-left transition-all text-sm",
                  "hover:border-primary/50",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                    : "border-border bg-card"
                )}
              >
                {hasVoted && (
                  <div
                    className="absolute inset-0 rounded-lg bg-primary/10 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <span className={cn(isSelected && "font-medium")}>{String(option)}</span>
                  </div>
                  {hasVoted && (
                    <span className="text-xs font-medium text-muted-foreground ml-2 shrink-0">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{uniqueVoters} {uniqueVoters === 1 ? "vote" : "votes"}</span>
        </div>
      </CardContent>
    </Card>
  );
};
