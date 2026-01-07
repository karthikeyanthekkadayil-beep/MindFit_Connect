import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const { data: users } = useQuery({
    queryKey: ["users-search", searchQuery],
    queryFn: async () => {
      // Use security definer function to get limited profile info
      const { data: allProfiles, error } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: [] });
      
      if (error) throw error;
      
      // Manually filter - RPC doesn't support filtering, so we get all and filter client-side
      // For a production app, you'd want a dedicated search RPC
      let filtered = allProfiles?.filter((p: any) => p.id !== currentUserId) || [];
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((p: any) => 
          p.full_name?.toLowerCase().includes(query)
        );
      }
      
      return filtered.slice(0, 20);
    },
    enabled: !!currentUserId && open,
  });

  const { data: myCommunities } = useQuery({
    queryKey: ["my-communities-for-messaging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("community:communities(id, name)")
        .eq("user_id", currentUserId!);

      if (error) throw error;
      return data.map((item) => item.community).filter(Boolean);
    },
    enabled: !!currentUserId && open,
  });

  const createDirectConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Check if conversation already exists
      const { data: existingMemberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUserId!);

      if (existingMemberships) {
        for (const membership of existingMemberships) {
          const { data: otherMembers } = await supabase
            .from("conversation_members")
            .select("conversation_id, conversation:conversations(type)")
            .eq("conversation_id", membership.conversation_id)
            .eq("user_id", userId);

          if (otherMembers && otherMembers.length > 0 && otherMembers[0].conversation?.type === "direct") {
            return { conversation_id: membership.conversation_id };
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
          { conversation_id: conversationId, user_id: currentUserId! },
          { conversation_id: conversationId, user_id: userId },
        ]);

      if (membersError) throw membersError;

      return { conversation_id: conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onOpenChange(false);
      navigate(`/messages/${data.conversation_id}`);
      toast.success("Conversation started");
    },
    onError: () => {
      toast.error("Failed to start conversation");
    },
  });

  const createGroupConversationMutation = useMutation({
    mutationFn: async () => {
      if (!groupName.trim() || selectedUsers.length === 0) {
        throw new Error("Please provide a group name and select members");
      }

      const conversationId = crypto.randomUUID();

      const { error: convError } = await supabase
        .from("conversations")
        .insert(
          {
            id: conversationId,
            type: "group",
            name: groupName,
            community_id: selectedCommunity || null,
          },
          { returning: "minimal" }
        );

      if (convError) throw convError;

      // Add all members including current user
      const members = [currentUserId!, ...selectedUsers].map((userId) => ({
        conversation_id: conversationId,
        user_id: userId,
      }));

      const { error: membersError } = await supabase
        .from("conversation_members")
        .insert(members);

      if (membersError) throw membersError;

      return { conversation_id: conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onOpenChange(false);
      setGroupName("");
      setSelectedUsers([]);
      setSelectedCommunity("");
      navigate(`/messages/${data.conversation_id}`);
      toast.success("Group created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    },
  });

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a direct message or create a group chat
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Search users</Label>
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => createDirectConversationMutation.mutate(user.id)}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      Click to start conversation
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="e.g., Running Buddies"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="community">Community (Optional)</Label>
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {myCommunities?.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search and select members</Label>
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => handleUserToggle(user.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.full_name}</span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                onClick={() => createGroupConversationMutation.mutate()}
                disabled={
                  !groupName.trim() ||
                  selectedUsers.length === 0 ||
                  createGroupConversationMutation.isPending
                }
              >
                {createGroupConversationMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
