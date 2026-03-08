import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Users, Calendar, MessageSquare, TrendingUp, ArrowLeft, UserCheck, AlertCircle, MessagesSquare } from "lucide-react";
import { ModeratorRequestsTab } from "@/components/admin/ModeratorRequestsTab";
import { CommunityManagementTab } from "@/components/admin/CommunityManagementTab";
import { EventManagementTab } from "@/components/admin/EventManagementTab";
import { PlatformSettingsTab } from "@/components/admin/PlatformSettingsTab";
import { ModeratorManagementTab } from "@/components/admin/ModeratorManagementTab";
import { ProblemReportsTab } from "@/components/admin/ProblemReportsTab";
import { BottomNav } from "@/components/BottomNav";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  role?: string;
}

interface Stats {
  totalUsers: number;
  totalCommunities: number;
  totalEvents: number;
  activeToday: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalCommunities: 0, totalEvents: 0, activeToday: 0 });

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in to access this page");
        navigate("/auth");
        return;
      }

      setSession(session);

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (roleError || !roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/auth");
        return;
      }

      setIsAdmin(true);
      await loadAdminData();
      setIsLoading(false);
    };

    checkAdminAccess();
  }, [navigate]);

  const loadAdminData = async () => {
    // Load users with their roles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (profilesData) {
      // Get emails from auth.users (admin can access this)
      const userIds = profilesData.map(p => p.id);
      
      // Get roles for users
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles = profilesData.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || "Unknown",
        email: "Email visible in auth dashboard",
        created_at: profile.created_at,
        role: rolesMap.get(profile.id) || "user"
      }));

      setUsers(usersWithRoles);
    }

    // Load statistics
    const [
      { count: usersCount },
      { count: communitiesCount },
      { count: eventsCount }
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("communities").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true })
    ]);

    setStats({
      totalUsers: usersCount || 0,
      totalCommunities: communitiesCount || 0,
      totalEvents: eventsCount || 0,
      activeToday: 0 // This would require tracking user activity
    });
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // First, delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Then insert new role with proper typing
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as "admin" | "moderator" | "user" }]);

      if (error) throw error;

      toast.success(`User role updated to ${newRole}`);
      await loadAdminData();
    } catch (error) {
      toast.error("Failed to update user role");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-white hover:bg-white/20 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                  <h1 className="text-xl sm:text-3xl font-heading font-bold truncate">Admin Panel</h1>
                </div>
                <p className="text-white/90 mt-1 text-xs sm:text-base hidden sm:block">Manage users, content, and platform settings</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/20 text-xs sm:text-sm shrink-0"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Communities</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalCommunities}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalEvents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Active Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.activeToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 h-auto">
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2">Users</TabsTrigger>
            <TabsTrigger value="moderators" className="text-xs sm:text-sm py-2">
              <Shield className="h-3 w-3 sm:hidden" />
              <span className="hidden sm:inline">Moderators</span>
              <span className="sm:hidden">Mods</span>
            </TabsTrigger>
            <TabsTrigger value="mod-requests" className="text-xs sm:text-sm py-2">
              <UserCheck className="h-3 w-3 sm:hidden" />
              <span className="hidden sm:inline">Requests</span>
              <span className="sm:hidden">Reqs</span>
            </TabsTrigger>
            <TabsTrigger value="problems" className="text-xs sm:text-sm py-2">
              <AlertCircle className="h-3 w-3 sm:hidden" />
              <span className="hidden sm:inline">Problems</span>
              <span className="sm:hidden">Prob</span>
            </TabsTrigger>
            <TabsTrigger value="communities" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Communities</span>
              <span className="sm:hidden">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs sm:text-sm py-2">Events</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">User Management</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm">Role</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Joined</TableHead>
                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium text-xs sm:text-sm max-w-[100px] truncate">{user.full_name}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                            >
                              <SelectTrigger className="w-24 sm:w-32 h-8 text-xs sm:text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderators" className="space-y-4">
            <ModeratorManagementTab />
          </TabsContent>

          <TabsContent value="mod-requests" className="space-y-4">
            <ModeratorRequestsTab />
          </TabsContent>

          <TabsContent value="problems" className="space-y-4">
            <ProblemReportsTab />
          </TabsContent>

          <TabsContent value="communities" className="space-y-4">
            <CommunityManagementTab />
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <EventManagementTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <PlatformSettingsTab />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Admin;
