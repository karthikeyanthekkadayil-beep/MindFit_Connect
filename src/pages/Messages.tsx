import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MessageCircle, Trash2 } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { MotionFadeIn, MotionScaleIn, MotionList, MotionItem, MotionSection } from "@/components/motion/MotionWrappers";
import { InteractiveCard } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

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
                .rpc("get_public_profile_info", { profile_id: members[0].user_id });

              otherUser = profile?.[0] || null;
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

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      // Delete own messages
      await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("sender_id", currentUserId!);

      // Remove self from conversation
      await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId!);

      // Check if any members remain
      const { count } = await supabase
        .from("conversation_members")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId);

      if (count === 0) {
        await supabase.from("conversations").delete().eq("id", conversationId);
      }
    },
    onSuccess: () => {
      toast.success("Chat deleted");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Failed to delete chat"),
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <MotionFadeIn className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground text-xs sm:text-base">Your conversations</p>
          </div>
          <Button onClick={() => setIsNewConversationOpen(true)} className="gap-1 sm:gap-2 shrink-0 h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </MotionFadeIn>

        <MotionFadeIn delay={0.1}>
          <div className="relative mb-4 sm:mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 sm:h-11"
            />
          </div>
        </MotionFadeIn>

        {isLoading ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">Loading conversations...</div>
        ) : conversations && conversations.length > 0 ? (
          <MotionList className="space-y-2" delay={0.15}>
            {conversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation);
              
              return (
                <MotionItem key={conversation.id}>
                  <InteractiveCard
                    className="p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors group border-0 shadow-sm"
                    onClick={() => navigate(`/messages/${conversation.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={getConversationAvatar(conversation)} />
                        <AvatarFallback>
                          {conversation.type === "direct"
                            ? getConversationTitle(conversation)[0]
                            : "G"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-2">
                          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                            {getConversationTitle(conversation)}
                          </h3>
                          {conversation.latestMessage && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conversation.latestMessage.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {conversation.latestMessage?.content || "No messages yet"}
                          </p>
                          {unreadCount > 0 && (
                            <Badge variant="default" className="ml-2 shrink-0 text-[10px] sm:text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conversation.community && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                            {conversation.community.name}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete(conversation.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </InteractiveCard>
                </MotionItem>
              );
            })}
          </MotionList>
        ) : (
          <MotionScaleIn delay={0.2}>
            <div className="text-center py-8 sm:py-12">
              <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Start a conversation to connect with others
              </p>
              <Button onClick={() => setIsNewConversationOpen(true)} className="h-10">
                New Conversation
              </Button>
            </div>
          </MotionScaleIn>
        )}

        <NewConversationDialog
          open={isNewConversationOpen}
          onOpenChange={setIsNewConversationOpen}
        />
      </div>

      {/* Delete Chat Confirmation */}
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove you from this conversation and delete your messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (chatToDelete) deleteConversationMutation.mutate(chatToDelete);
                setChatToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
