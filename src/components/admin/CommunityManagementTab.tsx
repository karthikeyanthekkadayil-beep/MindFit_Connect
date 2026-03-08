import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Trash2, Users, Lock, Globe, Loader2, Eye, Pencil, Save, X, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Community {
  id: string;
  name: string;
  category: string;
  description: string | null;
  member_count: number | null;
  is_private: boolean | null;
  created_at: string;
  creator_id: string;
  creator_name?: string;
  image_url: string | null;
}

interface CommunityMember {
  id: string;
  user_id: string;
  role: string | null;
  joined_at: string;
  full_name?: string;
}

const CATEGORIES = ["fitness", "wellness", "nutrition", "mindfulness", "social", "outdoor", "sports", "other"];

export const CommunityManagementTab = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View dialog
  const [viewCommunity, setViewCommunity] = useState<Community | null>(null);
  const [viewMembers, setViewMembers] = useState<CommunityMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Edit dialog
  const [editCommunity, setEditCommunity] = useState<Community | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadCommunities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, category, description, member_count, is_private, created_at, creator_id, image_url")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load communities");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const creatorIds = [...new Set(data.map(c => c.creator_id))];
      const { data: profiles } = await supabase.rpc("get_public_profiles_info", { profile_ids: creatorIds });
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

      setCommunities(data.map(c => ({ ...c, creator_name: profileMap.get(c.creator_id) || "Unknown" })));
    } else {
      setCommunities([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadCommunities(); }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Cascade: posts, members, events, then community
      await supabase.from("community_posts").delete().eq("community_id", id);
      await supabase.from("community_members").delete().eq("community_id", id);
      const { error } = await supabase.from("communities").delete().eq("id", id);
      if (error) throw error;
      toast.success("Community deleted successfully");
      setCommunities(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error("Failed to delete community");
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (community: Community) => {
    setViewCommunity(community);
    setLoadingMembers(true);
    const { data: members } = await supabase
      .from("community_members")
      .select("id, user_id, role, joined_at")
      .eq("community_id", community.id)
      .order("joined_at", { ascending: true })
      .limit(50);

    if (members && members.length > 0) {
      const memberUserIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase.rpc("get_public_profiles_info", { profile_ids: memberUserIds });
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
      setViewMembers(members.map(m => ({ ...m, full_name: profileMap.get(m.user_id) || "Unknown" })));
    } else {
      setViewMembers([]);
    }
    setLoadingMembers(false);
  };

  const openEdit = (community: Community) => {
    setEditCommunity(community);
    setEditName(community.name);
    setEditDescription(community.description || "");
    setEditCategory(community.category);
    setEditPrivate(community.is_private || false);
  };

  const handleSaveEdit = async () => {
    if (!editCommunity || !editName.trim()) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("communities")
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        category: editCategory,
        is_private: editPrivate,
      })
      .eq("id", editCommunity.id);

    if (error) {
      toast.error("Failed to update community");
    } else {
      toast.success("Community updated");
      setEditCommunity(null);
      loadCommunities();
    }
    setIsSaving(false);
  };

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    (c.creator_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Community Management</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            View, edit, and manage all platform communities ({communities.length} total)
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, category, or creator..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">{search ? "No communities match your search." : "No communities yet."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Category</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Creator</TableHead>
                    <TableHead className="text-xs sm:text-sm">Members</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Visibility</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(community => (
                    <TableRow key={community.id}>
                      <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">{community.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{community.category}</Badge></TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell truncate max-w-[100px]">{community.creator_name}</TableCell>
                      <TableCell><span className="flex items-center gap-1 text-xs sm:text-sm"><Users className="h-3 w-3" />{community.member_count || 0}</span></TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {community.is_private ? (
                          <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" /> Private</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-secondary border-secondary/30"><Globe className="h-3 w-3" /> Public</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleView(community)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(community)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingId === community.id}>
                                {deletingId === community.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{community.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the community, its members, posts, and all associated data.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(community.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
      <Dialog open={!!viewCommunity} onOpenChange={open => { if (!open) setViewCommunity(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{viewCommunity?.name}</DialogTitle>
            <DialogDescription className="text-xs">Community Details</DialogDescription>
          </DialogHeader>
          {viewCommunity && (
            <div className="space-y-4">
              {viewCommunity.image_url && (
                <img src={viewCommunity.image_url} alt={viewCommunity.name} className="w-full h-32 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="text-xs capitalize mt-1">{viewCommunity.category}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Visibility</p>
                  <Badge variant="outline" className="text-xs mt-1 gap-1">
                    {viewCommunity.is_private ? <><Lock className="h-3 w-3" /> Private</> : <><Globe className="h-3 w-3" /> Public</>}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Members</p>
                  <p className="text-sm font-medium mt-1">{viewCommunity.member_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Created</p>
                  <p className="text-sm mt-1">{format(new Date(viewCommunity.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Creator</p>
                  <p className="text-sm mt-1">{viewCommunity.creator_name}</p>
                </div>
              </div>
              {viewCommunity.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">{viewCommunity.description}</div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Members ({viewMembers.length})</p>
                {loadingMembers ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : viewMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No members</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm">{member.full_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{member.role || "member"}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(member.joined_at), "MMM d")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCommunity} onOpenChange={open => { if (!open) setEditCommunity(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Community</DialogTitle>
            <DialogDescription className="text-xs">Update community details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} maxLength={500} rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Private Community</Label>
              <Switch checked={editPrivate} onCheckedChange={setEditPrivate} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditCommunity(null)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
