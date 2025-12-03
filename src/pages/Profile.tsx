import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Loader2, User, Heart, Settings, LogOut } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

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

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
      <div className="container max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="h-16 w-16 sm:h-24 sm:w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg sm:text-2xl">
                  {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{profile.full_name || "User"}</h1>
                <p className="text-muted-foreground text-sm sm:text-base truncate">{profile.email}</p>
                {profile.location && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{profile.location}</p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none h-9 sm:h-10 text-sm">
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none h-9 sm:h-10 text-sm">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none h-9 sm:h-10 text-sm">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11">
            <TabsTrigger value="personal" className="text-xs sm:text-sm px-1 sm:px-3">
              <User className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs sm:text-sm px-1 sm:px-3">
              <Heart className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm px-1 sm:px-3">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your basic profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="h-10 sm:h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className="text-sm">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profile.date_of_birth || ""}
                      onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                      disabled={!isEditing}
                      className="h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm">Gender</Label>
                    <Select
                      value={profile.gender || ""}
                      onValueChange={(value) => setProfile({ ...profile, gender: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Select gender" />
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

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm">Location</Label>
                  <Input
                    id="location"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    disabled={!isEditing}
                    placeholder="City, Country"
                    className="h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_interests" className="text-sm">Activity Interests</Label>
                  {isEditing ? (
                    <Input
                      id="activity_interests"
                      value={(profile.activity_interests || []).join(", ")}
                      onChange={(e) => updateArrayField("activity_interests", e.target.value)}
                      placeholder="Hiking, Yoga, Running (comma separated)"
                      className="h-10 sm:h-11"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {profile.activity_interests?.map((interest, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{interest}</Badge>
                      )) || <span className="text-muted-foreground text-sm">No interests added</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Profile Tab */}
          <TabsContent value="health">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Health Profile</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your health and fitness information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2">
                  <Label htmlFor="fitness_level" className="text-sm">Fitness Level</Label>
                  <Select
                    value={profile.fitness_level || ""}
                    onValueChange={(value) => setProfile({ ...profile, fitness_level: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Select fitness level" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="health_goals" className="text-sm">Health Goals</Label>
                  {isEditing ? (
                    <Input
                      id="health_goals"
                      value={(profile.health_goals || []).join(", ")}
                      onChange={(e) => updateArrayField("health_goals", e.target.value)}
                      placeholder="Weight loss, Muscle gain, Flexibility (comma separated)"
                      className="h-10 sm:h-11"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {profile.health_goals?.map((goal, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{goal}</Badge>
                      )) || <span className="text-muted-foreground text-sm">No goals set</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_conditions" className="text-sm">Medical Conditions</Label>
                  {isEditing ? (
                    <Input
                      id="medical_conditions"
                      value={(profile.medical_conditions || []).join(", ")}
                      onChange={(e) => updateArrayField("medical_conditions", e.target.value)}
                      placeholder="Diabetes, Asthma (comma separated)"
                      className="h-10 sm:h-11"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {profile.medical_conditions?.map((condition, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{condition}</Badge>
                      )) || <span className="text-muted-foreground text-sm">No conditions listed</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dietary_preferences" className="text-sm">Dietary Preferences</Label>
                  {isEditing ? (
                    <Input
                      id="dietary_preferences"
                      value={(profile.dietary_preferences || []).join(", ")}
                      onChange={(e) => updateArrayField("dietary_preferences", e.target.value)}
                      placeholder="Vegetarian, Vegan, Gluten-free (comma separated)"
                      className="h-10 sm:h-11"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {profile.dietary_preferences?.map((pref, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{pref}</Badge>
                      )) || <span className="text-muted-foreground text-sm">No preferences set</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Account Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2 text-sm sm:text-base">Email</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground break-all">{profile.email}</p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2 text-sm sm:text-base">Account Actions</h3>
                    <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
