import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Trash2, Users, Loader2, Eye, Pencil, Save, X, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  created_at: string;
  updated_at: string;
  community_id: string | null;
  member_count: number;
  members: ConversationMember[];
}

interface ConversationMember {
  id: string;
  user_id: string;
  joined_at: string;
  full_name?: string;
}

export const GroupManagementTab = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View dialog
  const [viewConversation, setViewConversation] = useState<Conversation | null>(null);

  // Edit dialog
  const [editConversation, setEditConversation] = useState<Conversation | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadConversations = async () => {
    setLoading(true);

    // Get all group conversations
    const { data, error } = await supabase
      .from("conversations")
      .select("id, name, type, created_at, updated_at, community_id")
      .eq("type", "group")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load group conversations");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // Get members for all conversations
      const conversationIds = data.map(c => c.id);
      const { data: membersData } = await supabase
        .from("conversation_members")
        .select("id, user_id, joined_at, conversation_id")
        .in("conversation_id", conversationIds);

      // Get profile names
      const memberUserIds = [...new Set(membersData?.map(m => m.user_id) || [])];
      let profileMap = new Map<string, string>();
      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles_info", { profile_ids: memberUserIds });
        profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
      }

      // Group members by conversation
      const membersByConvo = new Map<string, ConversationMember[]>();
      membersData?.forEach(m => {
        const convoMembers = membersByConvo.get((m as any).conversation_id) || [];
        convoMembers.push({ ...m, full_name: profileMap.get(m.user_id) || "Unknown" });
        membersByConvo.set((m as any).conversation_id, convoMembers);
      });

      setConversations(data.map(c => ({
        ...c,
        members: membersByConvo.get(c.id) || [],
        member_count: (membersByConvo.get(c.id) || []).length,
      })));
    } else {
      setConversations([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadConversations(); }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Cascade: messages, members, then conversation
      await supabase.from("messages").delete().eq("conversation_id", id);
      await supabase.from("conversation_members").delete().eq("conversation_id", id);
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Group deleted successfully");
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (conversation: Conversation) => {
    setViewConversation(conversation);
  };

  const openEdit = (conversation: Conversation) => {
    setEditConversation(conversation);
    setEditName(conversation.name || "");
  };

  const handleSaveEdit = async () => {
    if (!editConversation) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("conversations")
      .update({ name: editName.trim() || null })
      .eq("id", editConversation.id);

    if (error) {
      toast.error("Failed to update group");
    } else {
      toast.success("Group updated");
      setEditConversation(null);
      loadConversations();
    }
    setIsSaving(false);
  };

  const getDisplayName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const names = conv.members.slice(0, 3).map(m => m.full_name).join(", ");
    return names || "Unnamed Group";
  };

  const filtered = conversations.filter(c => {
    const name = getDisplayName(c).toLowerCase();
    const memberNames = c.members.map(m => (m.full_name || "").toLowerCase()).join(" ");
    return name.includes(search.toLowerCase()) || memberNames.includes(search.toLowerCase());
  });

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Group Conversation Management</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            View, edit, and manage all group conversations ({conversations.length} total)
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or member..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">{search ? "No groups match your search." : "No group conversations yet."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Members</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Last Active</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Created</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(conversation => (
                    <TableRow key={conversation.id}>
                      <TableCell className="font-medium text-xs sm:text-sm max-w-[150px] truncate">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {getDisplayName(conversation)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs sm:text-sm">
                          <Users className="h-3 w-3" />{conversation.member_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        {format(new Date(conversation.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        {format(new Date(conversation.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleView(conversation)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(conversation)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingId === conversation.id}>
                                {deletingId === conversation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the group conversation, all messages, and member data. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(conversation.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewConversation} onOpenChange={open => { if (!open) setViewConversation(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{viewConversation ? getDisplayName(viewConversation) : ""}</DialogTitle>
            <DialogDescription className="text-xs">Group Conversation Details</DialogDescription>
          </DialogHeader>
          {viewConversation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Type</p>
                  <Badge variant="secondary" className="text-xs mt-1 capitalize">{viewConversation.type}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Members</p>
                  <p className="text-sm font-medium mt-1">{viewConversation.member_count}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Created</p>
                  <p className="text-sm mt-1">{format(new Date(viewConversation.created_at), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Last Active</p>
                  <p className="text-sm mt-1">{format(new Date(viewConversation.updated_at), "MMM d, yyyy")}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Members ({viewConversation.members.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {viewConversation.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{member.full_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(member.joined_at), "MMM d")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editConversation} onOpenChange={open => { if (!open) setEditConversation(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Group</DialogTitle>
            <DialogDescription className="text-xs">Update group conversation name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Group Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Enter group name..." maxLength={100} className="h-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditConversation(null)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
