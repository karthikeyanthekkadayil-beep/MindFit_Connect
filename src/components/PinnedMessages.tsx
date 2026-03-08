import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pin, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface PinnedMessagesBarProps {
  conversationId: string;
  currentUserId: string | null;
  onMessageClick: (messageId: string) => void;
}

export const PinnedMessagesBar = ({
  conversationId,
  currentUserId,
  onMessageClick,
}: PinnedMessagesBarProps) => {
  const queryClient = useQueryClient();

  const { data: pinnedMessages } = useQuery({
    queryKey: ["pinned-messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pinned_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("pinned_at", { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch the actual messages
      const messageIds = data.map((p) => p.message_id);
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .in("id", messageIds);

      const senderIds = [...new Set(messages?.map((m) => m.sender_id) || [])];
      const { data: profiles } = await supabase.rpc("get_public_profiles_info", {
        profile_ids: senderIds,
      });

      return data.map((pin) => {
        const msg = messages?.find((m) => m.id === pin.message_id);
        const sender = profiles?.find((p) => p.id === msg?.sender_id);
        return { ...pin, message: msg, sender };
      });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("pinned_messages")
        .delete()
        .eq("message_id", messageId)
        .eq("conversation_id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinned-messages", conversationId] });
      toast.success("Message unpinned");
    },
  });

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  return (
    <div className="border-b bg-accent/30 px-4 py-2 space-y-1 max-h-32 overflow-y-auto">
      {pinnedMessages.map((pin) => (
        <div
          key={pin.id}
          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded-lg px-2 py-1 transition-colors"
          onClick={() => pin.message && onMessageClick(pin.message.id)}
        >
          <Pin className="h-3.5 w-3.5 text-primary shrink-0 rotate-45" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-xs text-primary">
              {pin.sender?.full_name || "Unknown"}
            </span>
            <p className="text-xs text-muted-foreground truncate">
              {pin.message?.content || "Message deleted"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              if (pin.message) unpinMutation.mutate(pin.message.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

interface PinMessageButtonProps {
  messageId: string;
  conversationId: string;
  currentUserId: string | null;
  isPinned: boolean;
}

export const PinMessageButton = ({
  messageId,
  conversationId,
  currentUserId,
  isPinned,
}: PinMessageButtonProps) => {
  const queryClient = useQueryClient();

  const pinMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated");

      if (isPinned) {
        const { error } = await supabase
          .from("pinned_messages")
          .delete()
          .eq("message_id", messageId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pinned_messages").insert({
          message_id: messageId,
          conversation_id: conversationId,
          pinned_by: currentUserId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinned-messages", conversationId] });
      toast.success(isPinned ? "Message unpinned" : "Message pinned");
    },
    onError: () => {
      toast.error("Failed to update pin");
    },
  });

  return (
    <button
      onClick={() => pinMutation.mutate()}
      className={cn(
        "opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary",
        isPinned && "opacity-100 text-primary"
      )}
      title={isPinned ? "Unpin message" : "Pin message"}
    >
      <Pin className={cn("h-3 w-3", isPinned && "fill-current rotate-45")} />
    </button>
  );
};
