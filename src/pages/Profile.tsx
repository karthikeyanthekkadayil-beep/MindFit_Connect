import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, User, Heart, Settings, LogOut, Camera, ImagePlus, Shield, Sun, Moon, Monitor, Smartphone, Droplets } from "lucide-react";
import { useTheme } from "next-themes";
import { Slider } from "@/components/ui/slider";
import { BottomNav } from "@/components/BottomNav";
import { useCamera, base64ToBlob } from "@/hooks/useCamera";
import { Capacitor } from "@capacitor/core";
import { MotionFadeIn, MotionScaleIn, MotionSection } from "@/components/motion/MotionWrappers";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  location: string | null;
  fitness_level: string | null;
  health_goals: string[] | null;
  medical_conditions: string[] | null;
  dietary_preferences: string[] | null;
  activity_interests: string[] | null;
  notification_preferences: any;
  privacy_settings: any;
}

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "glass", label: "Glass", icon: Smartphone },
    { value: "liquid-glass", label: "Liquid", icon: Droplets },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(value)}
          className="h-9 sm:h-10 text-xs sm:text-sm gap-1.5"
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
};

const GlassOpacitySlider = () => {
  const { theme } = useTheme();
  const [opacity, setOpacity] = useState(() => {
    const saved = localStorage.getItem("glass-opacity");
    return saved ? parseFloat(saved) : 1;
  });

  const applyOpacity = useCallback((value: number) => {
    document.documentElement.style.setProperty("--glass-opacity", String(value));
  }, []);

  useEffect(() => {
    applyOpacity(opacity);
  }, [opacity, applyOpacity]);

  const handleChange = (values: number[]) => {
    const val = values[0];
    setOpacity(val);
    localStorage.setItem("glass-opacity", String(val));
    applyOpacity(val);
  };

  if (theme !== "liquid-glass" && theme !== "glass") return null;

  return (
    <div>
      <h3 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-base">Glass Opacity</h3>
      <div className="flex items-center gap-3">
        <span className="text-[10px] sm:text-xs text-muted-foreground w-6">Low</span>
        <Slider
          value={[opacity]}
          onValueChange={handleChange}
          min={0.2}
          max={1.5}
          step={0.05}
          className="flex-1"
        />
        <span className="text-[10px] sm:text-xs text-muted-foreground w-7">High</span>
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
        {Math.round(opacity * 100)}%
      </p>
    </div>
  );
};

const ModeratorSection = ({ navigate }: { navigate: (path: string) => void }) => {
  const [isMod, setIsMod] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setChecked(true); return; }
      supabase.from("user_roles").select("role").eq("user_id", session.user.id)
        .in("role", ["moderator", "admin"]).then(({ data }) => {
          setIsMod(!!(data && data.length > 0));
          setChecked(true);
        });
    });
  }, []);

  if (!checked) return null;

  return (
    <div>
      <h3 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-base">Moderation</h3>
      {isMod ? (
        <Button variant="outline" onClick={() => navigate("/moderator")} className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm">
          <Shield className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Moderator Panel
        </Button>
      ) : (
        <Button variant="outline" onClick={() => navigate("/moderator/request")} className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm">
          <Shield className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Request Moderator Access
        </Button>
      )}
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { takePhoto, pickFromGallery, isSupported: isCameraSupported } = useCamera();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchProfile(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          date_of_birth: profile.date_of_birth,
          gender: profile.gender,
          location: profile.location,
          fitness_level: profile.fitness_level,
          health_goals: profile.health_goals,
          medical_conditions: profile.medical_conditions,
          dietary_preferences: profile.dietary_preferences,
          activity_interests: profile.activity_interests,
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const uploadAvatar = async (blob: Blob, userId: string) => {
    const fileName = `${userId}/avatar-${Date.now()}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAvatarUpload = async (source: 'camera' | 'gallery' | 'file', file?: File) => {
    if (!profile) return;
    
    setUploadingAvatar(true);
    try {
      let blob: Blob;

      if (source === 'file' && file) {
        blob = file;
      } else if (source === 'camera') {
        const photo = await takePhoto();
        if (!photo?.base64String) return;
        blob = base64ToBlob(photo.base64String, `image/${photo.format || 'jpeg'}`);
      } else {
        const photo = await pickFromGallery();
        if (!photo?.base64String) return;
        blob = base64ToBlob(photo.base64String, `image/${photo.format || 'jpeg'}`);
      }

      const avatarUrl = await uploadAvatar(blob, profile.id);

      // Update profile with new avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: avatarUrl });
      toast.success('Profile photo updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      handleAvatarUpload('file', file);
    }
  };

  const updateArrayField = (field: keyof Profile, value: string) => {
    if (!profile) return;
    const currentArray = (profile[field] as string[]) || [];
    const newArray = value.split(",").map(item => item.trim()).filter(Boolean);
    setProfile({ ...profile, [field]: newArray });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-6">
        <MotionScaleIn>
        <Card>
          <CardContent className="pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <div className="relative">
                <Avatar className="h-14 w-14 sm:h-24 sm:w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-base sm:text-2xl">
                    {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Hidden file input for web */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                {/* Camera/Upload button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full"
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    {isCameraSupported && Capacitor.isNativePlatform() ? (
                      <>
                        <DropdownMenuItem onClick={() => handleAvatarUpload('camera')}>
                          <Camera className="mr-2 h-4 w-4" />
                          Take Photo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAvatarUpload('gallery')}>
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Choose from Gallery
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Upload Photo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">{profile.full_name || "User"}</h1>
                <p className="text-muted-foreground text-xs sm:text-base truncate">{profile.email}</p>
                {profile.location && (
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">{profile.location}</p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none h-8 sm:h-10 text-xs sm:text-sm">
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none h-8 sm:h-10 text-xs sm:text-sm">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none h-8 sm:h-10 text-xs sm:text-sm">
                      {saving && <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </MotionScaleIn>

        {/* Profile Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-11">
            <TabsTrigger value="personal" className="text-[10px] sm:text-sm px-1 sm:px-3 gap-1 sm:gap-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="text-[10px] sm:text-sm px-1 sm:px-3 gap-1 sm:gap-2">
              <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Health</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[10px] sm:text-sm px-1 sm:px-3 gap-1 sm:gap-2">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <MotionFadeIn delay={0.1}>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-sm sm:text-lg">Personal Information</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Your basic profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="full_name" className="text-xs sm:text-sm">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="h-9 sm:h-11 text-sm"
                  />
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="bio" className="text-xs sm:text-sm">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={2}
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="date_of_birth" className="text-xs sm:text-sm">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profile.date_of_birth || ""}
                      onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                      disabled={!isEditing}
                      className="h-9 sm:h-11 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="gender" className="text-xs sm:text-sm">Gender</Label>
                    <Select
                      value={profile.gender || ""}
                      onValueChange={(value) => setProfile({ ...profile, gender: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="h-9 sm:h-11 text-xs sm:text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="location" className="text-xs sm:text-sm">Location</Label>
                  <Input
                    id="location"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    disabled={!isEditing}
                    placeholder="City, Country"
                    className="h-9 sm:h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="activity_interests" className="text-xs sm:text-sm">Activity Interests</Label>
                  {isEditing ? (
                    <Input
                      id="activity_interests"
                      value={(profile.activity_interests || []).join(", ")}
                      onChange={(e) => updateArrayField("activity_interests", e.target.value)}
                      placeholder="Hiking, Yoga, Running"
                      className="h-9 sm:h-11 text-sm"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {profile.activity_interests?.map((interest, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">{interest}</Badge>
                      )) || <span className="text-muted-foreground text-xs sm:text-sm">No interests added</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </MotionFadeIn>
          </TabsContent>

          {/* Health Profile Tab */}
          <TabsContent value="health">
            <MotionFadeIn delay={0.1}>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-sm sm:text-lg">Health Profile</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Your health and fitness information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="fitness_level" className="text-xs sm:text-sm">Fitness Level</Label>
                  <Select
                    value={profile.fitness_level || ""}
                    onValueChange={(value) => setProfile({ ...profile, fitness_level: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-9 sm:h-11 text-xs sm:text-sm">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="health_goals" className="text-xs sm:text-sm">Health Goals</Label>
                  {isEditing ? (
                    <Input
                      id="health_goals"
                      value={(profile.health_goals || []).join(", ")}
                      onChange={(e) => updateArrayField("health_goals", e.target.value)}
                      placeholder="Weight loss, Muscle gain"
                      className="h-9 sm:h-11 text-sm"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {profile.health_goals?.map((goal, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">{goal}</Badge>
                      )) || <span className="text-muted-foreground text-xs sm:text-sm">No goals set</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="medical_conditions" className="text-xs sm:text-sm">Medical Conditions</Label>
                  {isEditing ? (
                    <Input
                      id="medical_conditions"
                      value={(profile.medical_conditions || []).join(", ")}
                      onChange={(e) => updateArrayField("medical_conditions", e.target.value)}
                      placeholder="Diabetes, Asthma"
                      className="h-9 sm:h-11 text-sm"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {profile.medical_conditions?.map((condition, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] sm:text-xs">{condition}</Badge>
                      )) || <span className="text-muted-foreground text-xs sm:text-sm">No conditions listed</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="dietary_preferences" className="text-xs sm:text-sm">Dietary Preferences</Label>
                  {isEditing ? (
                    <Input
                      id="dietary_preferences"
                      value={(profile.dietary_preferences || []).join(", ")}
                      onChange={(e) => updateArrayField("dietary_preferences", e.target.value)}
                      placeholder="Vegetarian, Vegan"
                      className="h-9 sm:h-11 text-sm"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {profile.dietary_preferences?.map((pref, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">{pref}</Badge>
                      )) || <span className="text-muted-foreground text-xs sm:text-sm">No preferences set</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </MotionFadeIn>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <MotionFadeIn delay={0.1}>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-sm sm:text-lg">Account Settings</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-base">Theme</h3>
                    <ThemeSwitcher />
                  </div>

                  <div>
                    <h3 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-base">Email</h3>
                    <p className="text-[10px] sm:text-sm text-muted-foreground break-all">{profile.email}</p>
                  </div>

                  <ModeratorSection navigate={navigate} />

                  <div>
                    <h3 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-base">Account Actions</h3>
                    <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm">
                      <LogOut className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Log Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </MotionFadeIn>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
