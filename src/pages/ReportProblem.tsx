import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MotionHeader, MotionFadeIn } from "@/components/motion/MotionWrappers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Send, Loader2, Clock, CheckCircle, MessageCircle, AlertTriangle, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface ProblemReport {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  attachment_urls: string[] | null;
}

const CATEGORIES = [
  { value: "bug", label: "Bug / Error" },
  { value: "feature", label: "Feature Request" },
  { value: "account", label: "Account Issue" },
  { value: "content", label: "Content Problem" },
  { value: "general", label: "General" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  open: { label: "Open", variant: "secondary", icon: Clock },
  in_progress: { label: "In Progress", variant: "default", icon: AlertTriangle },
  resolved: { label: "Resolved", variant: "outline", icon: CheckCircle },
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ReportProblem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  // Generate previews when files change
  useEffect(() => {
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const fetchReports = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data, error } = await supabase
      .from("problem_reports")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setReports(data as ProblemReport[]);
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - selectedFiles.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles = files.slice(0, remaining).filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("application/pdf")) {
        toast.error(`${file.name}: Only images and PDFs are allowed`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (userId: string, reportId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of selectedFiles) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${reportId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("report-attachments")
        .upload(path, file, { contentType: file.type });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("report-attachments")
          .getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    // Insert report first to get the ID
    const { data: reportData, error } = await supabase.from("problem_reports").insert({
      user_id: session.user.id,
      subject: subject.trim().slice(0, 200),
      description: description.trim().slice(0, 2000),
      category,
    }).select("id").single();

    if (error || !reportData) {
      toast.error("Failed to submit report");
      setIsSubmitting(false);
      return;
    }

    // Upload files if any
    if (selectedFiles.length > 0) {
      const urls = await uploadFiles(session.user.id, reportData.id);
      if (urls.length > 0) {
        await supabase
          .from("problem_reports")
          .update({ attachment_urls: urls } as any)
          .eq("id", reportData.id);
      }
    }

    toast.success("Report submitted successfully!");
    setSubject("");
    setDescription("");
    setCategory("general");
    setSelectedFiles([]);
    fetchReports();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MotionHeader className="bg-gradient-hero text-white px-4 pt-12 pb-6 safe-area-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/20 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-heading font-bold">Report a Problem</h1>
              <p className="text-white/80 text-xs">Submit issues or feedback</p>
            </div>
          </div>
        </div>
      </MotionHeader>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Tabs defaultValue="new">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="text-xs sm:text-sm">New Report</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">My Reports ({reports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4">
            <MotionFadeIn delay={0.1}>
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">Submit a Report</CardTitle>
                <CardDescription className="text-xs">Describe the issue and attach screenshots if needed</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Brief summary of the issue"
                      maxLength={200}
                      required
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Please describe the issue in detail..."
                      maxLength={2000}
                      required
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm">Attachments</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedFiles.length >= MAX_FILES}
                    >
                      <Paperclip className="h-4 w-4" />
                      {selectedFiles.length >= MAX_FILES
                        ? `Max ${MAX_FILES} files`
                        : `Attach files (${selectedFiles.length}/${MAX_FILES})`}
                    </Button>
                    <p className="text-xs text-muted-foreground">Images or PDFs, max 5MB each</p>

                    {/* File Previews */}
                    {selectedFiles.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
                            {file.type.startsWith("image/") ? (
                              <img
                                src={previews[index]}
                                alt={file.name}
                                className="w-full h-20 object-cover"
                              />
                            ) : (
                              <div className="w-full h-20 flex flex-col items-center justify-center gap-1 p-2">
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground truncate w-full text-center">{file.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Report
                  </Button>
                </form>
              </CardContent>
            </Card>
            </MotionFadeIn>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No reports submitted yet
                </CardContent>
              </Card>
            ) : (
              reports.map(report => {
                const config = statusConfig[report.status] || statusConfig.open;
                const StatusIcon = config.icon;
                const hasAttachments = report.attachment_urls && report.attachment_urls.length > 0;
                return (
                  <Card key={report.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{report.subject}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(report.created_at), "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                        <Badge variant={config.variant} className="text-xs shrink-0 gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{CATEGORIES.find(c => c.value === report.category)?.label || report.category}</Badge>
                        {hasAttachments && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {report.attachment_urls!.length} file{report.attachment_urls!.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>

                      {/* Attachment thumbnails */}
                      {hasAttachments && (
                        <div className="flex gap-2 overflow-x-auto">
                          {report.attachment_urls!.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img src={url} alt={`Attachment ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-border" />
                              ) : (
                                <div className="h-16 w-16 rounded-lg border border-border flex items-center justify-center bg-muted/30">
                                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}

                      {report.admin_response && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageCircle className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-medium text-primary">Admin Response</span>
                          </div>
                          <p className="text-xs text-foreground">{report.admin_response}</p>
                          {report.responded_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(report.responded_at), "MMM d, yyyy · h:mm a")}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default ReportProblem;
