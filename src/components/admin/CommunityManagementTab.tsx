import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Trash2, Users, Lock, Globe, Loader2 } from "lucide-react";

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
}

export const CommunityManagementTab = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCommunities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, category, description, member_count, is_private, created_at, creator_id")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load communities");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const creatorIds = [...new Set(data.map(c => c.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      setCommunities(
        data.map(c => ({
          ...c,
          creator_name: profileMap.get(c.creator_id) || "Unknown",
        }))
      );
    } else {
      setCommunities([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCommunities();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Delete members first, then the community
      await supabase.from("community_members").delete().eq("community_id", id);
      const { error } = await supabase.from("communities").delete().eq("id", id);
      if (error) throw error;
      toast.success("Community deleted successfully");
      setCommunities(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error("Failed to delete community. You may need owner privileges.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    (c.creator_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Community Management</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Monitor, search, and manage all platform communities ({communities.length} total)
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, or creator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            {search ? "No communities match your search." : "No communities yet."}
          </p>
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
                    <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">
                      {community.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {community.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell truncate max-w-[100px]">
                      {community.creator_name}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs sm:text-sm">
                        <Users className="h-3 w-3" />
                        {community.member_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {community.is_private ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="h-3 w-3" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 text-secondary border-secondary/30">
                          <Globe className="h-3 w-3" /> Public
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === community.id}
                          >
                            {deletingId === community.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{community.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the community, its members, posts, and all associated data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(community.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
