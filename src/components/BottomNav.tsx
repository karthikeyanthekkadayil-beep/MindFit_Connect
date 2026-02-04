import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Users, TrendingUp, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "home", icon: Home, label: "Home", path: "/dashboard" },
  { id: "plan", icon: Calendar, label: "Plan", path: "/planner" },
  { id: "social", icon: Users, label: "Social", path: "/communities" },
  { id: "progress", icon: TrendingUp, label: "Progress", path: "/progress" },
  { id: "profile", icon: UserCircle, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === "/planner") return "plan";
    if (location.pathname === "/profile") return "profile";
    if (location.pathname.startsWith("/communities")) return "social";
    if (location.pathname.startsWith("/progress")) return "progress";
    if (location.pathname === "/dashboard") return "home";
    return "home";
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path: string) => {
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 touch-target",
                  "active:scale-90",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full" />
                )}
                
                <div className={cn(
                  "flex flex-col items-center justify-center transition-transform duration-200",
                  isActive && "scale-110"
                )}>
                  <tab.icon 
                    className={cn(
                      "h-6 w-6 transition-all duration-200",
                      isActive && "stroke-[2.5px]"
                    )} 
                  />
                  <span className={cn(
                    "text-[10px] mt-1 font-medium transition-all duration-200",
                    isActive && "font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
