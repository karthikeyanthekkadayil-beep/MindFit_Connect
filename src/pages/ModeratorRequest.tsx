import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Shield, Clock, CheckCircle2, XCircle, Send } from "lucide-react";


interface ModeratorRequest {
  id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const ModeratorRequest = () => {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [existingRequest, setExistingRequest] = useState<ModeratorRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadyModerator, setIsAlreadyModerator] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        navigate("/auth");
        return;
      }

      // Check if already a moderator
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["moderator", "admin"]);

      if (roleData && roleData.length > 0) {
        setIsAlreadyModerator(true);
        setIsLoading(false);
        return;
      }

      // Check for existing request
      const { data: requestData } = await supabase
        .from("moderator_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (requestData && requestData.length > 0) {
        setExistingRequest(requestData[0] as ModeratorRequest);
      }

      setIsLoading(false);
    };

    loadData();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request");
      return;
    }

    setIsSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("moderator_requests")
      .insert({ user_id: session.user.id, reason: reason.trim() });

    if (error) {
      if (error.code === "23505") {
        toast.error("You already have a pending request");
      } else {
        toast.error("Failed to submit request");
        console.error(error);
      }
    } else {
      toast.success("Request submitted successfully!");
      // Reload to show the request
      const { data } = await supabase
        .from("moderator_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setExistingRequest(data[0] as ModeratorRequest);
      }
      setReason("");
    }
    setIsSubmitting(false);
  };

  const statusConfig = {
    pending: { icon: Clock, color: "bg-amber-100 text-amber-800", label: "Pending Review" },
    approved: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800", label: "Approved" },
    rejected: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Rejected" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-hero text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h1 className="text-xl font-heading font-bold">Become a Moderator</h1>
            </div>
            <p className="text-white/80 text-xs mt-0.5">Help keep our community safe</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {isAlreadyModerator ? (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold">You're already a moderator!</h2>
              <p className="text-muted-foreground text-sm">
                You already have moderator or admin privileges.
              </p>
              <Button onClick={() => navigate("/moderator")} className="mt-2">
                Go to Moderator Panel
              </Button>
            </CardContent>
          </Card>
        ) : existingRequest && existingRequest.status === "pending" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Request</CardTitle>
              <CardDescription>Submitted on {new Date(existingRequest.created_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={statusConfig.pending.color}>
                  <Clock className="h-3 w-3 mr-1" />
                  {statusConfig.pending.label}
                </Badge>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground font-medium mb-1">Your reason:</p>
                <p className="text-sm">{existingRequest.reason}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                An admin will review your request soon. You'll be notified of the outcome.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {existingRequest && existingRequest.status === "rejected" && (
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={statusConfig.rejected.color}>
                      <XCircle className="h-3 w-3 mr-1" />
                      Previous Request Rejected
                    </Badge>
                  </div>
                  {existingRequest.admin_notes && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Admin note:</span> {existingRequest.admin_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {existingRequest && existingRequest.status === "approved" && (
              <Card className="border-emerald-300">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={statusConfig.approved.color}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Previously Approved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Moderator Access</CardTitle>
                <CardDescription className="text-xs">
                  Tell us why you'd like to become a moderator
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Why do you want to be a moderator?</label>
                  <Textarea
                    placeholder="Describe your experience, motivation, and how you'd contribute to keeping our community safe and welcoming..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 20 characters. Be specific about your qualifications.
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || reason.trim().length < 20}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">What do moderators do?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Review and moderate community content</p>
                <p>• Help resolve disputes between members</p>
                <p>• Ensure community guidelines are followed</p>
                <p>• Support new members in getting started</p>
              </CardContent>
            </Card>
          </>
        )}
      </main>

    </div>
  );
};

export default ModeratorRequest;
