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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex justify-around items-center h-14 sm:h-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-0 py-1 active:scale-95",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
