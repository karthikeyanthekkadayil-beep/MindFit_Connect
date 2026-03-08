import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, CheckSquare, XSquare } from "lucide-react";

interface BulkPostActionsProps {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  totalCount: number;
  onDeleted: (ids: string[]) => void;
  requireNotes: boolean;
}

export const BulkPostActions = ({
  selectedIds, onToggle, onSelectAll, onClearAll, totalCount, onDeleted, requireNotes,
}: BulkPostActionsProps) => {
  const [reason, setReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleBulkDelete = async () => {
    if (requireNotes && !reason.trim()) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("community_posts").delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} posts deleted`);
      onDeleted(ids);
      setOpen(false);
      setReason("");
    } catch {
      toast.error("Failed to delete posts");
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedIds.size === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={onSelectAll}>
          <CheckSquare className="h-3.5 w-3.5" /> Select All
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
      <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={onSelectAll}>
        <CheckSquare className="h-3.5 w-3.5" /> All
      </Button>
      <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={onClearAll}>
        <XSquare className="h-3.5 w-3.5" /> Clear
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" className="h-9 text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedIds.size})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Delete Posts</DialogTitle>
            <DialogDescription>Delete {selectedIds.size} selected posts. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={requireNotes ? "Reason (required)" : "Reason (optional)"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting || (requireNotes && !reason.trim())}
              onClick={handleBulkDelete}
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedIds.size} Posts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const BulkCheckbox = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
  <Checkbox checked={checked} onCheckedChange={onToggle} className="shrink-0" />
);
