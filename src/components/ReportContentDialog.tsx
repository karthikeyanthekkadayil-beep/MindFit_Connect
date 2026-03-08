import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flag } from "lucide-react";

interface ReportContentDialogProps {
  contentType: "post" | "event" | "comment";
  contentId: string;
  trigger?: React.ReactNode;
}

const REPORT_REASONS = [
  "Spam or misleading",
  "Harassment or bullying",
  "Inappropriate content",
  "Misinformation",
  "Other",
];

export const ReportContentDialog = ({ contentType, contentId, trigger }: ReportContentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const handleSubmit = async () => {
    const finalReason = selectedReason === "Other" ? reason.trim() : selectedReason;
    if (!finalReason) {
      toast.error("Please select or provide a reason");
      return;
    }
    if (!currentUserId) {
      toast.error("Please log in to report content");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: currentUserId,
        content_type: contentType,
        content_id: contentId,
        reason: finalReason,
      });

      if (error) throw error;

      toast.success("Report submitted. Thank you for helping keep our community safe.");
      setOpen(false);
      setReason("");
      setSelectedReason("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-destructive">
            <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs">Report</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Report {contentType}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Help us understand the issue with this {contentType}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs sm:text-sm font-medium mb-1 block">Reason</label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedReason === "Other" && (
            <Textarea
              placeholder="Describe the issue..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm"
              rows={3}
            />
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedReason || (selectedReason === "Other" && !reason.trim()))}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
