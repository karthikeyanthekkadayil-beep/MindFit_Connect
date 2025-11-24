import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", searchQuery],
    queryFn: async () => {
      const { data: memberData, error } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUserId!);

      if (error) throw error;

      const conversationIds = memberData.map(m => m.conversation_id);
      if (conversationIds.length === 0) return [];

      const { data: conversationData } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (!conversationData) return [];

      // Get latest message for each conversation
      const conversationsWithData = await Promise.all(
        conversationData.map(async (conversation) => {
          const { data: latestMessage } = await supabase
            .from("messages")
            .select("content, sender_id, created_at")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let otherUser = null;
          if (conversation.type === "direct") {
            const { data: members } = await supabase
              .from("conversation_members")
              .select("user_id")
              .eq("conversation_id", conversation.id)
              .neq("user_id", currentUserId!);

            if (members && members.length > 0) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .eq("id", members[0].user_id)
                .single();

              otherUser = profile;
            }
          }

          let community = null;
          if (conversation.community_id) {
            const { data: communityData } = await supabase
              .from("communities")
              .select("name")
              .eq("id", conversation.community_id)
              .single();

            community = communityData;
          }

          return {
            ...conversation,
            otherUser,
            latestMessage,
            community,
          };
        })
      );

      // Filter by search query
      if (searchQuery) {
        return conversationsWithData.filter((conv) => {
          const searchTerm = searchQuery.toLowerCase();
          if (conv.type === "direct") {
            return conv.otherUser?.full_name?.toLowerCase().includes(searchTerm);
          }
          return conv.name?.toLowerCase().includes(searchTerm);
        });
      }

      return conversationsWithData;
    },
    enabled: !!currentUserId,
  });

  const getConversationTitle = (conversation: any) => {
    if (conversation.type === "direct") {
      return conversation.otherUser?.full_name || "Unknown User";
    }
    return conversation.name || "Group Chat";
  };

  const getConversationAvatar = (conversation: any) => {
    if (conversation.type === "direct") {
      return conversation.otherUser?.avatar_url;
    }
    return null;
  };

  const getUnreadCount = (conversation: any) => {
    // This would require additional logic to track unread messages
    return 0;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Your conversations</p>
          </div>
          <Button onClick={() => setIsNewConversationOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading conversations...</div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation);
              
              return (
                <Card
                  key={conversation.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getConversationAvatar(conversation)} />
                      <AvatarFallback>
                        {conversation.type === "direct"
                          ? getConversationTitle(conversation)[0]
                          : "G"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {getConversationTitle(conversation)}
                        </h3>
                        {conversation.latestMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.latestMessage.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground truncate">
                {conversation.latestMessage?.content || "No messages yet"}
              </p>
                        {unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conversation.community && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {conversation.community.name}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation to connect with others
            </p>
            <Button onClick={() => setIsNewConversationOpen(true)}>
              New Conversation
            </Button>
          </div>
        )}

        <NewConversationDialog
          open={isNewConversationOpen}
          onOpenChange={setIsNewConversationOpen}
        />
      </div>
    </div>
  );
}
