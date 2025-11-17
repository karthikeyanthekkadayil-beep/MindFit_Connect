import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Home, Calendar, Users, Star, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "plan", icon: Calendar, label: "Plan" },
    { id: "social", icon: Users, label: "Social" },
    { id: "events", icon: Star, label: "Events" },
    { id: "profile", icon: UserCircle, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-hero text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-heading font-bold">SocialVibe</h1>
          <p className="text-white/90 mt-1">Welcome back!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Daily Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your personalized dashboard is being set up. Start exploring your wellness journey!
            </p>
            <Button onClick={handleLogout} variant="outline" className="mt-4">
              Logout
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No activities scheduled yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Communities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Join a community to get started</p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-6 w-6" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
