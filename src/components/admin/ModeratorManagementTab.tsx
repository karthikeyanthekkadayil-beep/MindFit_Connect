import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, ShieldOff, Loader2, Shield, AlertTriangle, FileText, RefreshCw, Save, Settings, Ban, Trash2, Eye } from "lucide-react";

interface Moderator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  reports_reviewed: number;
  warnings_issued: number;
}

interface ModSetting {
  key: string;
  value: unknown;
  description: string | null;
}

export const ModeratorManagementTab = () => {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Feature controls state
  const [modSettings, setModSettings] = useState<ModSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsModified, setSettingsModified] = useState<Set<string>>(new Set());
  const [savingSettings, setSavingSettings] = useState(false);

  const loadModerators = async () => {
    setLoading(true);
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "moderator");

    if (error || !roleData || roleData.length === 0) {
      setModerators([]);
      setLoading(false);
      return;
    }

    const userIds = roleData.map(r => r.user_id);
    const [{ data: profiles }, { data: reports }, { data: warnings }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url, created_at").in("id", userIds),
      supabase.from("content_reports").select("reviewed_by").in("reviewed_by", userIds),
      supabase.from("user_warnings").select("moderator_id").in("moderator_id", userIds),
    ]);

    const reportCounts = new Map<string, number>();
    reports?.forEach(r => {
      if (r.reviewed_by) reportCounts.set(r.reviewed_by, (reportCounts.get(r.reviewed_by) || 0) + 1);
    });
    const warningCounts = new Map<string, number>();
    warnings?.forEach(w => {
      warningCounts.set(w.moderator_id, (warningCounts.get(w.moderator_id) || 0) + 1);
    });

    setModerators(
      (profiles || []).map(p => ({
        user_id: p.id,
        full_name: p.full_name || "Unknown",
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        reports_reviewed: reportCounts.get(p.id) || 0,
        warnings_issued: warningCounts.get(p.id) || 0,
      }))
    );
    setLoading(false);
  };

  const loadModSettings = async () => {
    setSettingsLoading(true);
    const { data, error } = await (supabase as any)
      .from("platform_settings")
      .select("key, value, description")
      .eq("category", "moderator")
      .order("key");

    if (!error && data) {
      setModSettings(data);
    }
    setSettingsLoading(false);
  };

  useEffect(() => {
    loadModerators();
    loadModSettings();
  }, []);

  const handleRevoke = async (userId: string) => {
    setRevokingId(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "moderator");
      if (error) throw error;
      toast.success("Moderator role revoked");
      setModerators(prev => prev.filter(m => m.user_id !== userId));
    } catch {
      toast.error("Failed to revoke moderator role");
    } finally {
      setRevokingId(null);
    }
  };

  const updateSetting = (key: string, newValue: unknown) => {
    setModSettings(prev => prev.map(s => (s.key === key ? { ...s, value: newValue } : s)));
    setSettingsModified(prev => new Set(prev).add(key));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const toSave = modSettings.filter(s => settingsModified.has(s.key));
    try {
      for (const setting of toSave) {
        const { error } = await (supabase as any)
          .from("platform_settings")
          .update({ value: setting.value })
          .eq("key", setting.key);
        if (error) throw error;
      }
      toast.success(`${toSave.length} setting(s) saved`);
      setSettingsModified(new Set());
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const isBooleanSetting = (value: unknown) => value === true || value === false;
  const isNumberSetting = (key: string) => key === "mod_max_warnings_per_day";

  const settingIcon = (key: string) => {
    switch (key) {
      case "mod_can_review_reports": return <Eye className="h-4 w-4 text-primary" />;
      case "mod_can_issue_warnings": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "mod_can_delete_content": return <Trash2 className="h-4 w-4 text-destructive" />;
      case "mod_can_ban_users": return <Ban className="h-4 w-4 text-destructive" />;
      default: return <Settings className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatLabel = (key: string) =>
    key.replace(/^mod_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const filtered = moderators.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Feature Controls */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg">Moderator Permissions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Control what moderators can do on the platform
                </CardDescription>
              </div>
            </div>
            {settingsModified.size > 0 && (
              <Button onClick={handleSaveSettings} disabled={savingSettings} size="sm">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {modSettings.map((setting, i) => (
                <div key={setting.key}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      {settingIcon(setting.key)}
                      <div>
                        <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    {isBooleanSetting(setting.value) ? (
                      <Switch
                        checked={setting.value as boolean}
                        onCheckedChange={v => updateSetting(setting.key, v)}
                      />
                    ) : isNumberSetting(setting.key) ? (
                      <Input
                        type="number"
                        value={Number(setting.value)}
                        onChange={e => updateSetting(setting.key, Number(e.target.value))}
                        className="h-8 w-20 text-sm"
                      />
                    ) : null}
                  </div>
                  {i < modSettings.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl sm:text-2xl font-bold">{moderators.length}</p>
            <p className="text-xs text-muted-foreground">Active Moderators</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <FileText className="h-5 w-5 mx-auto mb-1 text-secondary" />
            <p className="text-xl sm:text-2xl font-bold">
              {moderators.reduce((sum, m) => sum + m.reports_reviewed, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Reports Reviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xl sm:text-2xl font-bold">
              {moderators.reduce((sum, m) => sum + m.warnings_issued, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Warnings Issued</p>
          </CardContent>
        </Card>
      </div>

      {/* Moderator list */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Active Moderators</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage moderator roles and view activity
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={loadModerators} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search moderators..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              {search ? "No moderators match your search." : "No active moderators."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Reports</TableHead>
                    <TableHead className="text-xs sm:text-sm">Warnings</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(mod => (
                    <TableRow key={mod.user_id}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {mod.avatar_url ? (
                              <img src={mod.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <Shield className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <span className="truncate max-w-[100px]">{mod.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{mod.reports_reviewed}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mod.warnings_issued > 0 ? "default" : "secondary"} className="text-xs">{mod.warnings_issued}</Badge>
                      </TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">
                        {new Date(mod.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                              disabled={revokingId === mod.user_id}
                            >
                              {revokingId === mod.user_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldOff className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Revoke</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke moderator role?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove moderator privileges from <strong>{mod.full_name}</strong>. They will no longer be able to review reports or issue warnings.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(mod.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Revoke Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
