import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Users, Search, Trash2, MoreVertical, BarChart3, Pin } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageReactions } from "@/components/MessageReactions";
import { ReadReceiptIndicator } from "@/components/ReadReceiptIndicator";
import { ChatAttachment, MessageAttachmentPreview } from "@/components/ChatAttachment";
import { VoiceRecorder, VoiceMessagePlayer } from "@/components/VoiceRecorder";
import { MessageSearch, HighlightedText } from "@/components/MessageSearch";
import { CreateChatPollDialog } from "@/components/CreateChatPollDialog";
import { ChatPollInline } from "@/components/ChatPollInline";
import { PinnedMessagesBar, PinMessageButton } from "@/components/PinnedMessages";

export default function ChatThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

      // Get member IDs with last_read_at
      const { data: memberData } = await supabase
        .from("conversation_members")
        .select("user_id, last_read_at")
        .eq("conversation_id", id!);

      // Get profiles using security definer function
      const userIds = memberData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: userIds });

      const members = profiles?.map(profile => {
        const memberInfo = memberData?.find(m => m.user_id === profile.id);
        return { 
          user: profile,
          last_read_at: memberInfo?.last_read_at 
        };
      }) || [];

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

      // Fetch reactions for all messages
      const messageIds = data.map(m => m.id);
      const { data: reactionsData } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);

      // Group reactions by message
      const reactionsMap = new Map<string, { emoji: string; count: number; hasReacted: boolean }[]>();
      
      for (const msg of data) {
        const msgReactions = reactionsData?.filter(r => r.message_id === msg.id) || [];
        const emojiCounts = new Map<string, { count: number; hasReacted: boolean }>();
        
        for (const reaction of msgReactions) {
          const existing = emojiCounts.get(reaction.emoji) || { count: 0, hasReacted: false };
          emojiCounts.set(reaction.emoji, {
            count: existing.count + 1,
            hasReacted: existing.hasReacted || reaction.user_id === currentUserId,
          });
        }
        
        reactionsMap.set(
          msg.id,
          Array.from(emojiCounts.entries()).map(([emoji, data]) => ({
            emoji,
            ...data,
          }))
        );
      }

      return data.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id),
        reactions: reactionsMap.get(msg.id) || [],
      }));
    },
    enabled: !!id && !!currentUserId,
  });

  const { data: pinnedMessageIds } = useQuery({
    queryKey: ["pinned-messages-ids", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pinned_messages")
        .select("message_id")
        .eq("conversation_id", id!);
      if (error) throw error;
      return new Set(data?.map((p) => p.message_id) || []);
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
          event: "*",
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

  // Scroll to bottom when messages change and mark as read
  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    
    // Mark messages as read
    if (id && currentUserId && messages && messages.length > 0) {
      supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", id)
        .eq("user_id", currentUserId)
        .then(() => {
          // Invalidate to update read receipts for other users
          queryClient.invalidateQueries({ queryKey: ["conversation", id] });
        });
    }
  }, [messages, id, currentUserId, queryClient, isSearchOpen]);

  const scrollToMessage = useCallback((messageId: string) => {
    setHighlightedMessageId(messageId);
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Clear highlight after animation
    setTimeout(() => setHighlightedMessageId(null), 2000);
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setHighlightedMessageId(null);
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      attachment,
    }: {
      content: string;
      attachment: { url: string; type: string; name: string } | null;
    }) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: id!,
        sender_id: currentUserId!,
        content,
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        attachment_name: attachment?.name || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      setPendingAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [chatDeleteOpen, setChatDeleteOpen] = useState(false);

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", currentUserId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Failed to delete message"),
  });

  const deleteChatMutation = useMutation({
    mutationFn: async () => {
      // Delete all messages in the conversation first
      const { error: msgError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", id!)
        .eq("sender_id", currentUserId!);

      // Remove self from conversation members
      const { error: memberError } = await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", id!)
        .eq("user_id", currentUserId!);
      
      if (memberError) throw memberError;

      // Check if any members remain
      const { count } = await supabase
        .from("conversation_members")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", id!);

      // If no members remain, delete the conversation
      if (count === 0) {
        await supabase.from("conversations").delete().eq("id", id!);
      }
    },
    onSuccess: () => {
      toast.success("Chat deleted");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate("/messages");
    },
    onError: () => toast.error("Failed to delete chat"),
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !pendingAttachment) || !currentUserId) return;
    stopTyping();
    sendMessageMutation.mutate({
      content: message.trim(),
      attachment: pendingAttachment,
    });
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {conversation?.type === "group" && (
                <DropdownMenuItem onClick={() => setShowPollDialog(true)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Create Poll
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setChatDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Pinned Messages Bar */}
      <PinnedMessagesBar
        conversationId={id!}
        currentUserId={currentUserId}
        onMessageClick={scrollToMessage}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20 relative">
        {isSearchOpen && messages && (
          <MessageSearch
            messages={messages}
            onResultSelect={(messageId) => {
              scrollToMessage(messageId);
              const input = document.querySelector('input[placeholder="Search messages..."]') as HTMLInputElement;
              if (input) setSearchQuery(input.value);
            }}
            onClose={handleSearchClose}
          />
        )}

        {/* Chat Polls */}
        {conversation?.type === "group" && (
          <ChatPollInline conversationId={id!} currentUserId={currentUserId} />
        )}
        
        {messages && messages.length > 0 ? (
          messages.map((msg, index) => {
            const isCurrentUser = msg.sender_id === currentUserId;
            const showAvatar =
              index === 0 ||
              messages[index - 1].sender_id !== msg.sender_id;
            const isHighlighted = highlightedMessageId === msg.id;

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                }}
                className={`group flex gap-3 transition-all duration-500 ${
                  isCurrentUser ? "flex-row-reverse" : ""
                } ${isHighlighted ? "bg-primary/10 -mx-4 px-4 py-2 rounded-lg" : ""}`}
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
                    {msg.attachment_url && msg.attachment_type === "voice" && msg.attachment_name && (
                      <VoiceMessagePlayer
                        url={msg.attachment_url}
                        name={msg.attachment_name}
                        isOwnMessage={isCurrentUser}
                      />
                    )}
                    {msg.attachment_url && msg.attachment_type && msg.attachment_type !== "voice" && msg.attachment_name && (
                      <MessageAttachmentPreview
                        url={msg.attachment_url}
                        type={msg.attachment_type}
                        name={msg.attachment_name}
                        isOwnMessage={isCurrentUser}
                      />
                    )}
                    {msg.content && (
                      <p className="text-sm break-words">
                        {searchQuery ? (
                          <HighlightedText text={msg.content} highlight={searchQuery} />
                        ) : (
                          msg.content
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), "p")}
                    </span>
                    {isCurrentUser && (
                      <button
                        onClick={() => setMessageToDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        title="Delete message"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    {isCurrentUser && (
                      <ReadReceiptIndicator
                        messageCreatedAt={msg.created_at}
                        isOwnMessage={isCurrentUser}
                        readReceipts={
                          conversation?.members
                            ?.filter((m: any) => m.user.id !== currentUserId)
                            .map((m: any) => ({
                              userId: m.user.id,
                              userName: m.user.full_name || "User",
                              readAt: m.last_read_at,
                            }))
                            .filter((r: any) => r.readAt) || []
                        }
                        conversationType={conversation?.type === "direct" ? "direct" : "group"}
                      />
                    )}
                    <MessageReactions
                      messageId={msg.id}
                      conversationId={id!}
                      currentUserId={currentUserId}
                      reactions={msg.reactions || []}
                      isOwnMessage={isCurrentUser}
                    />
                  </div>
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
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <ChatAttachment
            currentUserId={currentUserId!}
            onAttachmentReady={setPendingAttachment}
            pendingAttachment={pendingAttachment}
          />
          {pendingAttachment?.type === "voice" ? (
            <div className="flex-1 flex items-center">
              <VoiceRecorder
                currentUserId={currentUserId!}
                onVoiceReady={setPendingAttachment}
                pendingVoice={pendingAttachment}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          ) : (
            <>
              <Input
                value={message}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sendMessageMutation.isPending}
              />
              {!message.trim() && !pendingAttachment && (
                <VoiceRecorder
                  currentUserId={currentUserId!}
                  onVoiceReady={setPendingAttachment}
                  pendingVoice={null}
                  disabled={sendMessageMutation.isPending}
                />
              )}
            </>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={(!message.trim() && !pendingAttachment) || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Delete Message Dialog */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (messageToDelete) deleteMessageMutation.mutate(messageToDelete);
                setMessageToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chat Dialog */}
      <AlertDialog open={chatDeleteOpen} onOpenChange={setChatDeleteOpen}>
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
              onClick={() => deleteChatMutation.mutate()}
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
