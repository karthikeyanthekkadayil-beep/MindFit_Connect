import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface MessageLinkProps {
  userId: string;
  className?: string;
}

export function MessageLink({ userId, className }: MessageLinkProps) {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const createOrNavigateConversation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated");

      // Check if conversation already exists
      const { data: existingMemberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (existingMemberships) {
        for (const membership of existingMemberships) {
          const { data: otherMembers } = await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("conversation_id", membership.conversation_id)
            .eq("user_id", userId);

          if (otherMembers && otherMembers.length > 0) {
            // Check if conversation is direct
            const { data: conversation } = await supabase
              .from("conversations")
              .select("type")
              .eq("id", membership.conversation_id)
              .single();

            if (conversation?.type === "direct") {
              return { conversation_id: membership.conversation_id };
            }
          }
        }
      }

      // Create new conversation (avoid RETURNING/SELECT RLS issues by supplying id)
      const conversationId = crypto.randomUUID();

      const { error: convError } = await supabase
        .from("conversations")
        .insert({ id: conversationId, type: "direct" }, { returning: "minimal" });

      if (convError) throw convError;

      // Add both users as members
      const { error: membersError } = await supabase
        .from("conversation_members")
        .insert([
          { conversation_id: conversationId, user_id: currentUserId },
          { conversation_id: conversationId, user_id: userId },
        ]);

      if (membersError) throw membersError;

      return { conversation_id: conversationId };
    },
    onSuccess: (data) => {
      navigate(`/messages/${data.conversation_id}`);
    },
    onError: () => {
      toast.error("Failed to open conversation");
    },
  });

  if (currentUserId === userId) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => createOrNavigateConversation.mutate()}
      disabled={createOrNavigateConversation.isPending}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Message
    </Button>
  );
}
