import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send, Clock, CheckCircle, AlertTriangle, Paperclip, Image as ImageIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ProblemReport {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  attachment_urls: string[] | null;
}

interface ProfileInfo {
  id: string;
  full_name: string;
  avatar_url: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  open: { label: "Open", variant: "destructive", icon: Clock },
  in_progress: { label: "In Progress", variant: "default", icon: AlertTriangle },
  resolved: { label: "Resolved", variant: "outline", icon: CheckCircle },
};

const CATEGORIES = [
  { value: "bug", label: "Bug / Error" },
  { value: "feature", label: "Feature Request" },
  { value: "account", label: "Account Issue" },
  { value: "content", label: "Content Problem" },
  { value: "general", label: "General" },
];

export const ProblemReportsTab = () => {
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("problem_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data as ProblemReport[]);
      const userIds = [...new Set(data.map(r => r.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.rpc("get_public_profiles_info", { profile_ids: userIds });
        if (profileData) {
          const profileMap: Record<string, ProfileInfo> = {};
          profileData.forEach((p: ProfileInfo) => { profileMap[p.id] = p; });
          setProfiles(profileMap);
        }
      }
    }
    setIsLoading(false);
  };

  const handleRespond = async () => {
    if (!selectedReport) return;
    if (!response.trim() && newStatus === selectedReport.status) {
      toast.error("Please add a response or change the status");
      return;
    }
    setIsSending(true);

    const { data: { session } } = await supabase.auth.getSession();
    const updates: Record<string, unknown> = { status: newStatus || selectedReport.status };

    if (response.trim()) {
      updates.admin_response = response.trim().slice(0, 2000);
      updates.responded_by = session?.user.id;
      updates.responded_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("problem_reports")
      .update(updates)
      .eq("id", selectedReport.id);

    if (error) {
      toast.error("Failed to update report");
    } else {
      toast.success("Report updated successfully");
      setSelectedReport(null);
      setResponse("");
      fetchReports();
    }
    setIsSending(false);
  };

  const openReport = (report: ProblemReport) => {
    setSelectedReport(report);
    setResponse(report.admin_response || "");
    setNewStatus(report.status);
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  const filtered = filterStatus === "all" ? reports : reports.filter(r => r.status === filterStatus);
  const openCount = reports.filter(r => r.status === "open").length;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Problem Reports</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {openCount} open report{openCount !== 1 ? "s" : ""} · {reports.length} total
              </CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No reports found</p>
          ) : (
            filtered.map(report => {
              const config = statusConfig[report.status] || statusConfig.open;
              const StatusIcon = config.icon;
              const reporter = profiles[report.user_id];
              const hasAttachments = report.attachment_urls && report.attachment_urls.length > 0;
              return (
                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openReport(report)}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">{report.subject}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {reporter?.full_name || "Unknown"} · {format(new Date(report.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{CATEGORIES.find(c => c.value === report.category)?.label || report.category}</Badge>
                        <Badge variant={config.variant} className="text-xs gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {hasAttachments && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {report.attachment_urls!.length} file{report.attachment_urls!.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {report.admin_response && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <MessageCircle className="h-3 w-3" />
                          <span>Responded</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedReport?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              From {profiles[selectedReport?.user_id || ""]?.full_name || "Unknown"} · {selectedReport && format(new Date(selectedReport.created_at), "MMM d, yyyy · h:mm a")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
              <Badge variant="outline" className="text-xs">
                {CATEGORIES.find(c => c.value === selectedReport?.category)?.label || selectedReport?.category}
              </Badge>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">{selectedReport?.description}</div>
            </div>

            {/* Attachments Section */}
            {selectedReport?.attachment_urls && selectedReport.attachment_urls.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Attachments ({selectedReport.attachment_urls.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedReport.attachment_urls.map((url, i) => (
                    isImageUrl(url) ? (
                      <button
                        key={i}
                        onClick={() => setLightboxUrl(url)}
                        className="relative group rounded-lg overflow-hidden border border-border aspect-square"
                      >
                        <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-border aspect-square flex flex-col items-center justify-center gap-1 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">PDF</span>
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Update Status</p>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Admin Response</p>
              <Textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Write your response to the user..."
                maxLength={2000}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{response.length}/2000</p>
            </div>

            <Button onClick={handleRespond} disabled={isSending} className="w-full">
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Save Response
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Attachment" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
