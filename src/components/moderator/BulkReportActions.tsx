import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, CheckSquare, XSquare } from "lucide-react";

interface BulkReportActionsProps {
  selectedIds: Set<string>;
  moderatorId: string;
  onSelectAll: () => void;
  onClearAll: () => void;
  onActioned: () => void;
}

export const BulkReportActions = ({
  selectedIds, moderatorId, onSelectAll, onClearAll, onActioned,
}: BulkReportActionsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: "reviewed" | "dismissed") => {
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("content_reports")
        .update({ status: action, reviewed_by: moderatorId, reviewed_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} reports ${action}`);
      onActioned();
    } catch {
      toast.error("Failed to process reports");
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedIds.size === 0) {
    return (
      <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={onSelectAll}>
        <CheckSquare className="h-3.5 w-3.5" /> Select All
      </Button>
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
      <Button size="sm" variant="destructive" className="h-9 text-xs gap-1.5" disabled={isProcessing} onClick={() => handleBulkAction("reviewed")}>
        <CheckCircle className="h-3.5 w-3.5" /> Act ({selectedIds.size})
      </Button>
      <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" disabled={isProcessing} onClick={() => handleBulkAction("dismissed")}>
        <XCircle className="h-3.5 w-3.5" /> Dismiss ({selectedIds.size})
      </Button>
    </div>
  );
};
