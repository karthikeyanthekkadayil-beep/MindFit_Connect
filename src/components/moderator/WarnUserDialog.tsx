import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface WarnUserDialogProps {
  userId: string;
  userName: string;
  moderatorId: string;
  trigger?: React.ReactNode;
}

export const WarnUserDialog = ({ userId, userName, moderatorId, trigger }: WarnUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("user_warnings").insert({
        user_id: userId,
        moderator_id: moderatorId,
        reason: reason.trim(),
        warning_type: warningType,
      });

      if (error) throw error;

      toast.success(`${warningType === "mute" ? "Mute" : "Warning"} issued to ${userName}`);
      setOpen(false);
      setReason("");
      setWarningType("warning");
    } catch (error) {
      console.error("Error issuing warning:", error);
      toast.error("Failed to issue warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Warn User</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Issue a warning to <span className="font-medium">{userName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs sm:text-sm font-medium mb-1 block">Warning Type</label>
            <Select value={warningType} onValueChange={setWarningType}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="mute">Mute</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium mb-1 block">Reason</label>
            <Textarea
              placeholder="Describe the violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? "Issuing..." : "Issue Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
