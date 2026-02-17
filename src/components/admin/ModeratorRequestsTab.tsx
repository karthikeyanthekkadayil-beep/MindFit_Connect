import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

interface ModRequest {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_name?: string;
}

export const ModeratorRequestsTab = () => {
  const [requests, setRequests] = useState<ModRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("moderator_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load requests");
      console.error(error);
      setIsLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      setRequests(
        data.map((r: any) => ({
          ...r,
          user_name: nameMap.get(r.user_id) || "Unknown",
        }))
      );
    } else {
      setRequests([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (requestId: string, userId: string, action: "approved" | "rejected") => {
    setProcessingId(requestId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Update the request
    const { error: updateError } = await supabase
      .from("moderator_requests")
      .update({
        status: action,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes[requestId] || null,
      })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Failed to update request");
      console.error(updateError);
      setProcessingId(null);
      return;
    }

    // If approved, assign moderator role
    if (action === "approved") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "moderator" as const });

      if (roleError) {
        // Role might already exist
        if (roleError.code !== "23505") {
          toast.error("Failed to assign moderator role");
          console.error(roleError);
        }
      }
    }

    toast.success(`Request ${action} successfully`);
    setProcessingId(null);
    loadRequests();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const pastRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Moderator Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={loadRequests} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Loading requests...</p>
          ) : pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4">No pending requests</p>
          ) : (
            <div className="space-y-4 p-3 sm:p-0">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="border-amber-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-medium text-sm">{req.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {statusBadge(req.status)}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Reason:</p>
                      <p className="text-sm">{req.reason}</p>
                    </div>
                    <Textarea
                      placeholder="Admin notes (optional)..."
                      value={adminNotes[req.id] || ""}
                      onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, req.user_id, "approved")}
                        disabled={processingId === req.id}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(req.id, req.user_id, "rejected")}
                        disabled={processingId === req.id}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pastRequests.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm">Past Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="text-xs font-medium">{req.user_name}</TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
