import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  id: string;
  name: string;
}

export function useTypingIndicator(conversationId: string, currentUserId: string | null, currentUserName: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== currentUserId && presences.length > 0) {
            const presence = presences[0] as { isTyping?: boolean; name?: string };
            if (presence.isTyping) {
              users.push({ id: userId, name: presence.name || "Someone" });
            }
          }
        });
        
        setTypingUsers(users);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId) return;

    channelRef.current.track({
      isTyping: true,
      name: currentUserName || "User",
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentUserId, currentUserName]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;

    channelRef.current.track({
      isTyping: false,
      name: currentUserName || "User",
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentUserName]);

  return { typingUsers, startTyping, stopTyping };
}
