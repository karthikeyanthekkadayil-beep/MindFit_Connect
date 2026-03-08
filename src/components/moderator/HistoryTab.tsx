import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { History, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface HistoryItem {
  id: string;
  type: "report_reviewed" | "report_dismissed" | "warning_issued";
  reason: string;
  created_at: string;
  details?: string;
}

interface HistoryTabProps {
  moderatorId: string;
}

export const HistoryTab = ({ moderatorId }: HistoryTabProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [moderatorId]);

  const loadHistory = async () => {
    try {
      // Load resolved reports by this moderator
      const { data: reports } = await supabase
        .from("content_reports")
        .select("*")
        .eq("reviewed_by", moderatorId)
        .in("status", ["reviewed", "dismissed"])
        .order("reviewed_at", { ascending: false })
        .limit(50);

      // Load warnings issued by this moderator
      const { data: warnings } = await supabase
        .from("user_warnings")
        .select("*")
        .eq("moderator_id", moderatorId)
        .order("created_at", { ascending: false })
        .limit(50);

      const items: HistoryItem[] = [];

      reports?.forEach(r => {
        items.push({
          id: r.id,
          type: r.status === "reviewed" ? "report_reviewed" : "report_dismissed",
          reason: r.reason,
          created_at: r.reviewed_at || r.created_at,
          details: `${r.content_type} report`,
        });
      });

      warnings?.forEach(w => {
        items.push({
          id: w.id,
          type: "warning_issued",
          reason: w.reason,
          created_at: w.created_at,
          details: w.warning_type,
        });
      });

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHistory(items);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "report_reviewed": return <CheckCircle className="h-4 w-4 text-primary" />;
      case "report_dismissed": return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case "warning_issued": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "report_reviewed": return "Action Taken";
      case "report_dismissed": return "Dismissed";
      case "warning_issued": return "Warning Issued";
      default: return type;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading history...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <History className="h-4 w-4" />
          Moderation History ({history.length})
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Your moderation actions log</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No moderation actions yet</p>
        ) : (
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="p-3 rounded-lg border bg-card flex items-start gap-3">
                <div className="mt-0.5">{getIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] sm:text-xs">{getLabel(item.type)}</Badge>
                    {item.details && <span className="text-[10px] text-muted-foreground capitalize">{item.details}</span>}
                  </div>
                  <p className="text-xs sm:text-sm mt-1 line-clamp-2">{item.reason}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
