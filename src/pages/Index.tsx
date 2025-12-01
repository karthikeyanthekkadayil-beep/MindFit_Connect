import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Activity, Users, Heart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        navigate("/dashboard");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-heading font-bold gradient-hero bg-clip-text text-transparent">
            Welcome to SocialVibe
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Connect, stay active, and build meaningful relationships through wellness
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
              Learn More
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="space-y-4 p-6 rounded-lg bg-card shadow-md">
              <Activity className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-heading font-semibold">Personalized Wellness</h3>
              <p className="text-muted-foreground">
                AI-powered activity plans tailored to your health and fitness goals
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-lg bg-card shadow-md">
              <Users className="h-12 w-12 text-secondary mx-auto" />
              <h3 className="text-xl font-heading font-semibold">Community Building</h3>
              <p className="text-muted-foreground">
                Connect with like-minded people and join interest-based communities
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-lg bg-card shadow-md">
              <Heart className="h-12 w-12 text-accent mx-auto" />
              <h3 className="text-xl font-heading font-semibold">Health Tracking</h3>
              <p className="text-muted-foreground">
                Monitor your progress with comprehensive health and activity analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
