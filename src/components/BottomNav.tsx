import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Users, TrendingUp, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,8px)] pointer-events-none">
      <nav
        className="pointer-events-auto max-w-lg mx-auto mb-2 rounded-2xl bg-card/60 backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/15"
      >
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                data-nav-tab
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full rounded-xl touch-target",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active liquid glass pill with slide effect */}
                {isActive && (
                  <motion.span
                    className="absolute inset-1 rounded-xl overflow-hidden"
                    layoutId="activeTab"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{
                      background: 'linear-gradient(180deg, hsla(0,0%,100%,0.12) 0%, hsla(230,40%,50%,0.05) 50%, hsla(0,0%,100%,0.02) 100%)',
                      border: '1px solid hsla(0,0%,100%,0.1)',
                      borderTopColor: 'hsla(0,0%,100%,0.2)',
                      boxShadow: '0 1px 0 0 hsla(0,0%,100%,0.15) inset, 0 4px 16px hsla(230,60%,10%,0.1)',
                      backdropFilter: 'blur(16px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                    }}
                  >
                    {/* Specular bubble highlight */}
                    <span
                      className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, hsla(0,0%,100%,0.12) 0%, transparent 70%)',
                      }}
                    />
                  </motion.span>
                )}

                <div
                  className="relative z-10 flex flex-col items-center justify-center"
                >
                  <tab.icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive && "stroke-[2.5px]"
                    )}
                  />
                  <span className={cn(
                    "text-[10px] mt-0.5 font-medium transition-all duration-200",
                    isActive && "font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
