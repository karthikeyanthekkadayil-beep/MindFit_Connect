import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/TypingIndicator";

export default function ChatThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
      if (user?.id) {
        const { data: profile } = await supabase
          .rpc("get_public_profile_info", { profile_id: user.id });
        setCurrentUserName(profile?.[0]?.full_name || null);
      }
    });
  }, []);

  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(
    id || "",
    currentUserId,
    currentUserName
  );

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;

      // Get community info if exists
      let community = null;
      if (data.community_id) {
        const { data: communityData } = await supabase
          .from("communities")
          .select("name")
          .eq("id", data.community_id)
          .single();
        community = communityData;
      }

      // Get member IDs
      const { data: memberIds } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", id!);

      // Get profiles using security definer function
      const userIds = memberIds?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: userIds });

      const members = profiles?.map(profile => ({ user: profile })) || [];

      return { ...data, members, community };
    },
    enabled: !!id,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id!)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch sender profiles using security definer function
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: senderIds });

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id),
      }));
    },
    enabled: !!id,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: id!,
        sender_id: currentUserId!,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUserId) return;
    stopTyping();
    sendMessageMutation.mutate(message.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const getConversationTitle = () => {
    if (!conversation) return "";
    
    if (conversation.type === "direct") {
      const otherUser = conversation.members?.find(
        (m: any) => m.user.id !== currentUserId
      );
      return otherUser?.user?.full_name || "Unknown User";
    }
    
    return conversation.name || "Group Chat";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={
                conversation?.type === "direct"
                  ? conversation.members?.find(
                      (m: any) => m.user.id !== currentUserId
                    )?.user?.avatar_url || undefined
                  : undefined
              }
            />
            <AvatarFallback>
              {conversation?.type === "direct" ? getConversationTitle()[0] : "G"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{getConversationTitle()}</h2>
            {conversation?.type === "group" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {conversation.members?.length || 0} members
              </p>
            )}
            {conversation?.community && (
              <p className="text-xs text-muted-foreground">
                {conversation.community.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
        {messages && messages.length > 0 ? (
          messages.map((msg, index) => {
            const isCurrentUser = msg.sender_id === currentUserId;
            const showAvatar =
              index === 0 ||
              messages[index - 1].sender_id !== msg.sender_id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  isCurrentUser ? "flex-row-reverse" : ""
                }`}
              >
                {showAvatar ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.sender?.avatar_url} />
                    <AvatarFallback>{msg.sender?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8" />
                )}
                <div
                  className={`flex flex-col ${
                    isCurrentUser ? "items-end" : "items-start"
                  }`}
                >
                  {showAvatar && !isCurrentUser && (
                    <span className="text-xs text-muted-foreground mb-1">
                      {msg.sender?.full_name}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-md ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(msg.created_at), "p")}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <div className="border-t bg-card px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
