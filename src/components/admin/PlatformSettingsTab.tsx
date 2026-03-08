import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Settings, Shield, ToggleLeft } from "lucide-react";

interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: string;
}

export const PlatformSettingsTab = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState<Set<string>>(new Set());

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("platform_settings")
      .select("id, key, value, description, category")
      .order("category");

    if (error) {
      toast.error("Failed to load settings");
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateLocalSetting = (key: string, newValue: unknown) => {
    setSettings(prev =>
      prev.map(s => (s.key === key ? { ...s, value: newValue } : s))
    );
    setModified(prev => new Set(prev).add(key));
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = settings.filter(s => modified.has(s.key));

    try {
      for (const setting of toSave) {
        const { error } = await (supabase as any)
          .from("platform_settings")
          .update({ value: setting.value })
          .eq("key", setting.key);
        if (error) throw error;
      }
      toast.success(`${toSave.length} setting(s) saved successfully`);
      setModified(new Set());
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getSettingsByCategory = (category: string) =>
    settings.filter(s => s.category === category);

  const isBooleanSetting = (value: unknown): boolean =>
    value === true || value === false;

  const isNumberSetting = (key: string): boolean =>
    ["max_communities_per_user", "max_events_per_community", "auto_ban_report_threshold"].includes(key);

  const formatLabel = (key: string): string =>
    key
      .replace(/^feature_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const generalSettings = getSettingsByCategory("general");
  const policySettings = getSettingsByCategory("policies");
  const featureSettings = getSettingsByCategory("features");

  return (
    <div className="space-y-4">
      {/* Save bar */}
      {modified.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
          <p className="text-sm font-medium text-primary">
            {modified.size} unsaved change(s)
          </p>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Changes
          </Button>
        </div>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">General</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Basic platform configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-4">
          {generalSettings.map(setting => (
            <div key={setting.key}>
              {isBooleanSetting(setting.value) ? (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    checked={setting.value as boolean}
                    onCheckedChange={v => updateLocalSetting(setting.key, v)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                  <Input
                    value={String(setting.value).replace(/^"|"$/g, "")}
                    onChange={e =>
                      updateLocalSetting(setting.key, `"${e.target.value}"`)
                    }
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" />
            <CardTitle className="text-base sm:text-lg">User & Content Policies</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Rules and limits for users and content
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-4">
          {policySettings.map(setting => (
            <div key={setting.key}>
              {isBooleanSetting(setting.value) ? (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    checked={setting.value as boolean}
                    onCheckedChange={v => updateLocalSetting(setting.key, v)}
                  />
                </div>
              ) : isNumberSetting(setting.key) ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                  <Input
                    type="number"
                    value={Number(setting.value)}
                    onChange={e =>
                      updateLocalSetting(setting.key, Number(e.target.value))
                    }
                    className="h-9 text-sm w-32"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                  <Input
                    value={String(setting.value).replace(/^"|"$/g, "")}
                    onChange={e =>
                      updateLocalSetting(setting.key, `"${e.target.value}"`)
                    }
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-5 w-5 text-accent-foreground" />
            <CardTitle className="text-base sm:text-lg">Feature Toggles</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Enable or disable platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3">
          {featureSettings.map((setting, i) => (
            <div key={setting.key}>
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-medium">{formatLabel(setting.key)}</Label>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
                <Switch
                  checked={setting.value as boolean}
                  onCheckedChange={v => updateLocalSetting(setting.key, v)}
                />
              </div>
              {i < featureSettings.length - 1 && <Separator className="mt-2" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
