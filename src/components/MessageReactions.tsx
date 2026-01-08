import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏"];

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  conversationId: string;
  currentUserId: string | null;
  reactions: Reaction[];
  isOwnMessage: boolean;
}

export function MessageReactions({
  messageId,
  conversationId,
  currentUserId,
  reactions,
  isOwnMessage,
}: MessageReactionsProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const existingReaction = reactions.find(
        (r) => r.emoji === emoji && r.hasReacted
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", currentUserId)
          .eq("emoji", emoji);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setOpen(false);
    },
  });

  return (
    <div
      className={cn(
        "flex items-center gap-1 flex-wrap",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      {reactions
        .filter((r) => r.count > 0)
        .map((reaction) => (
          <button
            key={reaction.emoji}
            onClick={() => toggleReaction.mutate(reaction.emoji)}
            disabled={toggleReaction.isPending}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
              reaction.hasReacted
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted hover:bg-muted/80 border border-transparent"
            )}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction.mutate(emoji)}
                disabled={toggleReaction.isPending}
                className="p-1.5 text-lg hover:bg-accent rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
