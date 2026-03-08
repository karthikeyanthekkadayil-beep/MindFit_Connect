import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Flag, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name?: string;
}

interface ReportsTabProps {
  moderatorId: string;
  onActionTaken?: () => void;
}

export const ReportsTab = ({ moderatorId, onActionTaken }: ReportsTabProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const reporterIds = [...new Set(data.map(r => r.reporter_id))];
        const { data: profiles } = await supabase.rpc("get_public_profiles_info", { profile_ids: reporterIds });

        const enriched = data.map(report => ({
          ...report,
          reporter_name: profiles?.find(p => p.id === report.reporter_id)?.full_name || "Unknown",
        }));
        setReports(enriched);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (report: Report) => {
    try {
      // Delete the reported content
      if (report.content_type === "post") {
        await supabase.from("community_posts").delete().eq("id", report.content_id);
      } else if (report.content_type === "event") {
        await supabase.from("events").delete().eq("id", report.content_id);
      } else if (report.content_type === "comment") {
        await supabase.from("post_comments").delete().eq("id", report.content_id);
      }

      // Mark report as reviewed
      await supabase
        .from("content_reports")
        .update({ status: "reviewed", reviewed_by: moderatorId, reviewed_at: new Date().toISOString() })
        .eq("id", report.id);

      toast.success("Content removed and report resolved");
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "reviewed" } : r));
      onActionTaken?.();
    } catch (error) {
      console.error("Error taking action:", error);
      toast.error("Failed to take action");
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await supabase
        .from("content_reports")
        .update({ status: "dismissed", reviewed_by: moderatorId, reviewed_at: new Date().toISOString() })
        .eq("id", reportId);

      toast.success("Report dismissed");
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "dismissed" } : r));
      onActionTaken?.();
    } catch (error) {
      console.error("Error dismissing report:", error);
      toast.error("Failed to dismiss report");
    }
  };

  const pendingReports = reports.filter(r => r.status === "pending");
  const resolvedReports = reports.filter(r => r.status !== "pending");

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading reports...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            Pending Reports ({pendingReports.length})
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Flagged content awaiting review</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {pendingReports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No pending reports 🎉</p>
          ) : (
            <div className="space-y-3">
              {pendingReports.map(report => (
                <div key={report.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="destructive" className="text-[9px] sm:text-xs capitalize">{report.content_type}</Badge>
                        <Badge variant="outline" className="text-[9px] sm:text-xs">Pending</Badge>
                      </div>
                      <p className="text-xs sm:text-sm mt-1"><span className="font-medium">Reason:</span> {report.reason}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        Reported by {report.reporter_name} · {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleAction(report)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Act
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDismiss(report.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {resolvedReports.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Resolved Reports ({resolvedReports.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2">
              {resolvedReports.slice(0, 10).map(report => (
                <div key={report.id} className="p-2 rounded-lg border bg-muted/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === "reviewed" ? "default" : "secondary"} className="text-[9px] capitalize">{report.status}</Badge>
                      <span className="text-xs capitalize">{report.content_type}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{report.reason}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(report.created_at), "MMM d")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
